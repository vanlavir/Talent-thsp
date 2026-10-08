export const INDUSTRIES=['Разработка ПО и ИТ-сервисы','Финтех и банки','Электронная коммерция','Образование','Здравоохранение','Промышленность','Телекоммуникации','Медиа и развлечения','Игровая индустрия','Логистика и транспорт','Государственные сервисы','Кибербезопасность','Другая отрасль'];
export const SOFT_SKILLS=['Командная работа','Деловая коммуникация','Ответственность','Самоорганизация','Критическое мышление','Решение проблем','Адаптивность','Управление временем','Работа с обратной связью','Презентация решений','Наставничество','Лидерство','Переговоры','Разрешение конфликтов','Внимание к деталям','Понимание потребностей пользователя'];
export const FOCUS:Record<string,string[]>={Backend:['API и бизнес-логика','Базы данных и интеграции','Надёжность и инфраструктура'],Frontend:['Веб-интерфейсы','Доступность и дизайн-системы','Производительность интерфейсов'],'Data Science':['Анализ данных','Обучение и оценка моделей','Внедрение и мониторинг моделей']};
export const AUTONOMY=['С поддержкой наставника','Самостоятельно в рамках задачи','Проектирую решения и помогаю команде'];
export const COLLABORATION=['Индивидуальные задачи в команде','Совместная разработка и ревью','Координация и наставничество'];
export function validateCandidateFields(industry:unknown,skills:unknown){
 if(typeof industry!=='string'||!INDUSTRIES.includes(industry))throw Error('Выберите отрасль');
 if(!Array.isArray(skills)||skills.length<1||skills.length>SOFT_SKILLS.length||skills.some(s=>typeof s!=='string'||!SOFT_SKILLS.includes(s)))throw Error('Выберите хотя бы один софт-скилл из списка');
 return {industry,softSkills:[...new Set(skills)]};
}
export function validateSurvey(b:any){
 if(!INDUSTRIES.includes(b.industry)||!FOCUS[b.role]?.includes(b.focus)||!['Junior','Middle','Senior'].includes(b.grade)||!AUTONOMY.includes(b.autonomy)||!COLLABORATION.includes(b.collaboration))throw Error('Ответьте на все вопросы опроса');
 return {industry:b.industry,role:b.role,grade:b.grade,focus:b.focus,autonomy:b.autonomy,collaboration:b.collaboration};
}
