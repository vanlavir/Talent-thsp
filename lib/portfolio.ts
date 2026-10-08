export const PROJECT_TYPES=['Работа в компании','Хакатон','Крупный проект','Личный проект'];
export type PortfolioProject={id:string;title:string;type:string;organization:string;year:string;role:string;description:string;result:string;url:string;repository:string};
export function validatePortfolio(value:unknown):PortfolioProject[]{
 if(!Array.isArray(value)||value.length>20)throw new Error('В портфолио можно добавить до 20 проектов');
 return value.map((p:any)=>{
  if(!p||typeof p!=='object'||typeof p.title!=='string'||!p.title.trim()||p.title.length>120||!PROJECT_TYPES.includes(p.type))throw new Error('Укажите название и тип каждого проекта');
  const fields:Record<string,string>={};
  for(const [key,max] of Object.entries({organization:150,year:40,role:150,description:2000,result:1500,url:1000,repository:1000})){
   if(p[key]!=null&&typeof p[key]!=='string')throw new Error('Проверьте поля портфолио');
   const text=(p[key]||'').trim();if(text.length>max)throw new Error('Слишком длинное поле проекта');fields[key]=text;
  }
  for(const key of ['url','repository'])if(fields[key]){try{if(!['https:','http:'].includes(new URL(fields[key]).protocol))throw new Error();}catch{throw new Error('Ссылки проекта должны начинаться с https:// или http://');}}
  return {id:typeof p.id==='string'&&p.id.length<=100?p.id:crypto.randomUUID(),title:p.title.trim(),type:p.type,...fields} as PortfolioProject;
 });
}
