import {STACK_OPTIONS} from './profile-options';
import {questions} from './domain';
export function analyzeNeed(description:string){
 const text=description.toLowerCase();const stack=STACK_OPTIONS.filter(s=>s.length>1&&new RegExp('(^|[^\\p{L}\\p{N}_])'+s.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'($|[^\\p{L}\\p{N}_])','u').test(text));
 const role=/data science|машинн|аналитик|модел|pytorch|pandas|tensorflow/.test(text)?'Data Science':/frontend|фронтенд|react|vue|angular|интерфейс/.test(text)?'Frontend':'Backend';
 const grade=/senior|сеньор|архитект|ведущий/.test(text)?'Senior':/junior|джуниор|начинающ|стажёр|стажер/.test(text)?'Junior':'Middle';
 const qs=questions(role,grade);
 return {role,grade,stack,method:'Правила по ключевым словам; подтвердите специализацию и грейд вручную.',competencies:[...new Set(qs.map(q=>q.skill))],questions:qs.map(({answer,tolerance,...q}:any)=>q)};
}
