import {ageAt} from './education';
import {PDFDocument,PDFName,PDFString,rgb, type PDFFont} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

/** Same A4 template for all candidates; operates only on the saved owner profile. */
export async function createProfilePdf(p:any,regular:Uint8Array,boldBytes:Uint8Array,now=new Date()){
 const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const font=await doc.embedFont(regular,{subset:true}),bold=await doc.embedFont(boldBytes,{subset:true});
 const supported=new Set(font.getCharacterSet());
 const clean=(v:any)=>Array.from(String(v??'').replace(/[\x00-\x08\x0B-\x1F\x7F]/g,'')).map(c=>supported.has(c.codePointAt(0)!)?c:'?').join('');
 const ink=rgb(.10,.13,.18),muted=rgb(.40,.45,.52),red=rgb(.86,.12,.20);
 const width=595.28,height=841.89,left=44,right=width-44,lineWidth=right-left;
 let page:any,y=0;
 const date=now.toLocaleDateString('ru-RU',{timeZone:'Europe/Moscow'});
 doc.setTitle(clean('Профиль кандидата — '+p.name));doc.setAuthor('ФСП · Talent');doc.setCreator('ФСП Talent · стандартный PDF-профиль');doc.setCreationDate(now);
 function newPage(){page=doc.addPage([width,height]);page.drawRectangle({x:left,y:height-70,width:52,height:28,color:red});page.drawText('ФСП',{x:left+8,y:height-61,font:bold,size:17,color:rgb(1,1,1)});page.drawText('Talent',{x:left+64,y:height-60,font:bold,size:20,color:ink});page.drawText('ПРОФИЛЬ КАНДИДАТА',{x:right-145,y:height-57,font,size:9,color:muted});page.drawLine({start:{x:left,y:height-86},end:{x:right,y:height-86},color:rgb(.88,.90,.93),thickness:1});y=height-112;}
 function ensure(n:number){if(y-n<65)newPage();}
 function lines(text:string,size:number,f:PDFFont){const result:string[]=[];for(const paragraph of clean(text).split('\n')){let line='';for(const word of paragraph.split(/\s+/).filter(Boolean)){let next=line?line+' '+word:word;if(f.widthOfTextAtSize(next,size)<=lineWidth){line=next;continue;}if(line){result.push(line);line='';}let chunk='';for(const c of Array.from(word)){if(chunk&&f.widthOfTextAtSize(chunk+c,size)>lineWidth){result.push(chunk);chunk='';}chunk+=c;}line=chunk;}result.push(line);}return result;}
 function text(value:any,size=11,f=font,color=ink){const wrapped=lines(String(value??''),size,f);ensure(Math.min(wrapped.length,2)*(size+5));for(const line of wrapped){ensure(size+5);if(line)page.drawText(line,{x:left,y,font:f,size,color});y-=size+5;}y-=6;}
 function section(title:string){ensure(62);y-=7;text(title,14,bold,red);}
 function link(label:string,value:any){if(!value)return;let url:string;try{const u=new URL(String(value));if(!['http:','https:'].includes(u.protocol))return;url=u.href;}catch{return;}text(label,10,bold,muted);for(const line of lines(url,10,font)){ensure(15);page.drawText(line,{x:left,y,font,size:10,color:rgb(.16,.34,.60)});const annot=doc.context.register(doc.context.obj({Type:'Annot',Subtype:'Link',Rect:[left,y-3,left+font.widthOfTextAtSize(line,10),y+11],Border:[0,0,0],A:{S:'URI',URI:PDFString.of(url)}}));page.node.addAnnot(annot);y-=15;}y-=8;}
 newPage();text(p.name||'Кандидат',25,bold);text([p.role,p.grade||'Грейд не подтверждён'].filter(Boolean).join(' / '),14,bold);
 text([p.city,p.format,`Опыт: ${p.experience||0} лет`].filter(Boolean).join(' · '),11,font,muted);
 if(p.birthDate){text('Дата рождения: '+p.birthDate.split('-').reverse().join('.')+' · Возраст: '+ageAt(p.birthDate,now)+' лет');}if(p.education?.length){section('Образование');for(const e of p.education){text(e.institution,12,bold);text([e.level,e.specialty].filter(Boolean).join(' · '));text((e.status==='Учусь'?'Учится · планируемое окончание: ':'Год окончания: ')+e.graduationYear);}}section('Контакты');text(p.email||'Не указаны');
 section('Профессиональная область');text(p.industry||'Отрасль не указана');section('Софт-скиллы · самооценка');text(p.softSkills?.length?p.softSkills.join(' · '):'Не указаны');section('Навыки');text(Array.isArray(p.stack)&&p.stack.length?p.stack.join(' · '):'Не указаны');
 if(p.bio){section('О себе');text(p.bio);}
 section('Подтверждение квалификации');
 if(p.grade){text(`Категория: ${p.role} / ${p.grade}. Результат: ${p.score||0}/100.`);const d=new Date(p.verifiedAt);if(Number.isFinite(d.getTime()))text('Дата проверки: '+d.toLocaleDateString('ru-RU',{timeZone:'Europe/Moscow'}),10,font,muted);text('Результат теста платформы. Методика MVP ещё требует экспертной калибровки.',10,font,muted);}else text('Тестирование не пройдено. Самоописание не подтверждает грейд.');
 if(p.questionnaire){section('Опрос · самоописание');text('Направление задач: '+p.questionnaire.focus);text('Самостоятельность: '+p.questionnaire.autonomy);text('Взаимодействие: '+p.questionnaire.collaboration);}section('Связь с ФСП');text(p.fspId?`Указан ID участника: ${p.fspId}. Владение ID и достижения в реестре не проверены.`:'ID участника не привязан. История ФСП отсутствует.');
 const projects=Array.isArray(p.portfolio)?p.portfolio.slice(0,20):[];
 if(projects.length){section('Портфолио');for(const [i,project] of projects.entries()){ensure(85);text(`${i+1}. ${project.title}`,13,bold);text([project.type,project.organization,project.year].filter(Boolean).join(' · '),10,font,muted);if(project.role)text('Роль: '+project.role);if(project.description)text(project.description);if(project.result)text('Результат: '+project.result);link('Проект',project.url);link('Репозиторий',project.repository);y-=8;}}
 const pages=doc.getPages();pages.forEach((p,i)=>{p.drawLine({start:{x:left,y:46},end:{x:right,y:46},color:rgb(.88,.90,.93),thickness:1});p.drawText(`ФСП · Talent | Сформировано ${date}`,{x:left,y:30,font,size:8,color:muted});p.drawText(`${i+1} / ${pages.length}`,{x:right-28,y:30,font,size:8,color:muted});});
 return doc.save();
}
