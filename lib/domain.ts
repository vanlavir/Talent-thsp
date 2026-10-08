import {generateAssessment} from './assessment';
import {EXTRA_QUESTIONS} from './quiz-extra';
export const roles=['Backend','Frontend','Data Science'];
export const grades=['Junior','Middle','Senior'];
export type Candidate={id:string;name:string;role:string;grade:string|null;stack:string[];city:string;format:string;experience:number;score:number;email?:string;fsp:any[];bio:string;verifiedAt?:number;consent:boolean;published:boolean;birthDate?:string;education?:import('./education').Education[];industry?:string;softSkills?:string[];questionnaire?:any;portfolio?:import('./portfolio').PortfolioProject[];fspId?:string};
export function seed():Candidate[]{const rows=[
 ['anna','Анна Ковалева','Backend','Middle','Python,PostgreSQL,Docker,FastAPI','Москва','Удалённо',3,91,1,'Разрабатываю API и сервисы обработки данных.'],
 ['mikhail','Михаил Орлов','Backend','Middle','Python,Django,PostgreSQL,Redis','Казань','Удалённо',4,86,0,'Оптимизирую запросы и проектирую интеграции.'],
 ['daria','Дарья Соколова','Frontend','Middle','TypeScript,React,CSS,Next.js','Санкт-Петербург','Гибрид',3,94,2,'Создаю доступные и быстрые веб-интерфейсы.'],
 ['ivan','Иван Лебедев','Backend','Junior','Python,SQL,Git','Новосибирск','Удалённо',1,82,1,'Развиваюсь в серверной разработке и алгоритмах.'],
 ['elena','Елена Морозова','Data Science','Middle','Python,SQL,PyTorch,Pandas','Москва','Удалённо',3,89,0,'Работаю с рекомендациями и оценкой ML-моделей.'],
 ['alex','Александр Волков','Backend','Senior','Go,PostgreSQL,Kubernetes,Docker','Москва','Гибрид',7,93,1,'Веду команду платформенной разработки.'],
 ['polina','Полина Смирнова','Frontend','Junior','JavaScript,React,CSS','Самара','Удалённо',1,78,0,'Уделяю внимание доступности и деталям интерфейса.'],
 ['nikita','Никита Белов','Backend','Middle','Java,Spring,PostgreSQL,Docker','Екатеринбург','Офис',4,88,0,'Разрабатываю надёжные финансовые сервисы.']
 ];return rows.map((r:any)=>({id:r[0],name:r[1],role:r[2],grade:r[3],stack:r[4].split(','),city:r[5],format:r[6],experience:r[7],score:r[8],email:r[0]+'@example.test',fsp:r[9]?[{title:'Чемпионат ФСП · тестовые данные',place:r[9]===2?'2 место':'Финалист',year:2025,skill:'Алгоритмы и командная разработка'}]:[],bio:r[10],consent:true,published:true}));}
export function rank(c:Candidate,need:any){
 const req=[...new Set(String(need.stack||'').split(',').map(s=>s.trim()).filter(Boolean))],matched=req.filter(s=>c.stack.some(t=>t.toLowerCase()===s.toLowerCase())),missing=req.filter(s=>!matched.includes(s));
 const role=c.role===need.role,grade=c.grade===need.grade;
 const factors=[{label:'Специализация',value:35*Number(role),max:35},{label:'Грейд',value:20*Number(grade),max:20},{label:'Заявленный стек',value:25*(req.length?matched.length/req.length:1),max:25},{label:'Проверка компетенций',value:12*c.score/100,max:12},{label:'Достижения ФСП',value:Math.min(c.fsp.length,2)*3,max:6},{label:'Формат работы',value:2*Number(!need.format||c.format===need.format),max:2}];
 return {value:Math.round(factors.reduce((sum,f)=>sum+f.value,0)),matched,missing,factors,reasons:[role?'Специализация соответствует':'Другая специализация',grade?'Грейд подтверждён':'Другой грейд',req.length?`${matched.length} из ${req.length} заявленных навыков совпадают`:'Стек не ограничен',`Тест компетенций: ${c.score}/100`,c.fsp.length?'Есть достижения ФСП':'Без истории ФСП']};
}
export function legacyQuestions(role:string,grade:string){const n=3+Math.floor(Math.random()*6);
 const bank:Record<string,any[]>={Backend:[
 ['Алгоритмы',`Поиск в хеш-таблице с ${n*1000} элементами: средняя сложность?`,'O(1)','O(n)','O(n²)','O(log n)'],
 ['SQL','Что проверить первым для ускорения поиска по user_id и created_at?','Составной индекс и план запроса','Размер JSON','Удаление WHERE','Случайную сортировку'],
 ['API','Как защитить оплату от повторного POST после таймаута?','Ключ идемпотентности и атомарная запись','Скрыть кнопку','Повторять без проверки','Запретить POST'],
 ['Конкурентность',`${n} процессов меняют остаток товара. Как избежать потери обновлений?`,'Атомарное обновление или транзакция с блокировкой','SELECT и UPDATE без транзакции','Кеш браузера','Большой таймаут'],
 ['Безопасность','Как ограничить доступ к чужим приглашениям?','Проверять владельца ресурса на сервере','Скрыть ссылку','Доверять candidate_id','Сравнивать имена'],
 ['Надёжность','Заказ записан, но событие не отправлено из-за сбоя. Как устранить разрыв?','Transactional outbox','Отправлять только из браузера','Игнорировать ошибку','Бесконечная транзакция']],
 Frontend:[
 ['JavaScript',`Promise.resolve().then(() => console.log(${n})); console.log(0); Порядок вывода?`,`0, затем ${n}`,`${n}, затем 0`,'Только 0','Ошибка'],
 ['React','Зачем стабильный key в списке React?','Для идентичности элементов при обновлении','Для шифрования','Для сортировки на сервере','Для изменения URL'],
 ['Доступность','Как сделать поле формы доступным?','Связать label и input, описать ошибку','Только placeholder','Убрать фокус','Заменить input на div'],
 ['Сеть','Старый ответ поиска пришёл после нового. Что делать?','Отменять запрос или проверять актуальность','Принимать любой последний ответ','Увеличить шрифт','Очистить cookies'],
 ['Производительность',`В списке ${n*1000} карточек. Как уменьшить число DOM-узлов?`,'Виртуализация','Скрытые копии','Больше теней','Отключить кеш'],
 ['Безопасность','Как безопасно вывести пользовательский текст?','Экранировать текст; HTML очищать по allowlist','Вставлять HTML напрямую','Проверять только на клиенте','Удалять пробелы']],
 'Data Science':[
 ['Валидация','Как избежать утечки будущего в прогнозировании ряда?','Разделять train/test по времени','Перемешать даты','Обучаться на test','Удалить дату после обучения'],
 ['Метрики','Что полезнее accuracy при редком положительном классе?','Precision, recall и PR-AUC','Размер датасета','Время обучения','Число признаков'],
 ['Данные','На каких данных обучать нормализацию?','Только train','На всём датасете','Только test','На предсказаниях'],
 ['Эксперименты',`Как честно сравнить ${n} моделей ранжирования?`,'Одинаковые отложенные данные и метрики','Разные test','Лучший train score','Исключить ошибки'],
 ['Мониторинг','Что означает drift признаков?','Изменилось распределение входных данных','Данные потеряны','Модель идеальна','GPU недоступен'],
 ['Рекомендации','Как оценить релевантность первых пяти результатов?','Precision@5 на размеченных запросах','Число пользователей','Размер модели','Длина резюме']]};
 return [...bank[role],...EXTRA_QUESTIONS[role]].sort(()=>Math.random()-0.5).map(row=>{const options=row.slice(2).map((text:string)=>({text,random:Math.random()})).sort((a:any,b:any)=>a.random-b.random).map((x:any)=>x.text);return {id:crypto.randomUUID(),skill:row[0],text:row[1],options,answer:options.indexOf(row[2])};});}

export function questions(role:string,grade:string){return generateAssessment(role,grade);}
