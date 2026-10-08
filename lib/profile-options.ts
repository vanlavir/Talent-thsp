export const STACK_GROUPS = [
 {name:'Дизайн и прототипирование',items:['Figma','FigJam','Sketch','Adobe Photoshop','Adobe Illustrator','Adobe InDesign','Adobe After Effects','Adobe Premiere Pro','Blender','Cinema 4D','Framer','Webflow','ProtoPie','Axure RP','Spline','UI-дизайн','UX-дизайн','UX-исследования','Прототипирование','Дизайн-системы','Типографика','Брендинг','Motion-дизайн','3D-дизайн','Адаптивный дизайн','Доступность интерфейсов']},
 {name:'Языки',items:['Python','JavaScript','TypeScript','Java','C#','C++','Go','Rust','PHP','Ruby','Kotlin','Swift','SQL','R','Scala','Dart']},
 {name:'Фреймворки и платформы',items:['React','Vue','Angular','Next.js','Node.js','Express','NestJS','Django','FastAPI','Flask','Spring','ASP.NET','Laravel','Rails','Flutter']},
 {name:'Данные и инфраструктура',items:['PostgreSQL','MySQL','SQLite','MongoDB','Redis','ClickHouse','Elasticsearch','Kafka','RabbitMQ','Docker','Kubernetes','Linux','Git','Terraform','AWS']},
 {name:'Аналитика и машинное обучение',items:['Pandas','NumPy','scikit-learn','PyTorch','TensorFlow','Apache Spark']},
];
export const STACK_OPTIONS=STACK_GROUPS.flatMap(group=>group.items);
