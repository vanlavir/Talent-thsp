// Isolated local HTTP benchmark. Never populates a hosted database.
const fs=require('fs'),path=require('path'),assert=require('assert'),{DatabaseSync}=require('node:sqlite');
const base=process.argv[2],state=path.resolve(process.argv[3]),out=path.resolve(process.argv[4]||'docs/load-validation-results.json');
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local instance required');
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
(async()=>{
 const suffix=crypto.randomUUID().replaceAll('-',''),username='load_'+suffix.slice(0,16);
 const registered=await fetch(base+'/api/auth',{method:'POST',headers:{origin:base,'content-type':'application/json'},body:JSON.stringify({action:'register',username,email:username+'@example.test',password:'Local-load-fixture-2026',role:'employer'})});
 assert.equal(registered.status,201);const cookie=registered.headers.get('set-cookie').split(';')[0];
 let db;for(const file of files(state).filter(f=>f.endsWith('.sqlite'))){const connection=new DatabaseSync(file);if(connection.prepare("SELECT name FROM sqlite_master WHERE name='users'").get()){db=connection;break;}connection.close();}assert(db,'Local DB exists');
 const prefix='qa_load_'+suffix+'_';
 try{
  db.exec('BEGIN');for(let i=0;i<1000;i++){const id=prefix+i;db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run(id,id,id+'@example.test','unusable-fixture-hash','candidate',Date.now());const profile={id:'me',name:'Synthetic '+i,role:i%3?'Backend':'Frontend',grade:'Middle',stack:['Python','PostgreSQL'],score:80+i%20,city:'Москва',format:'Удалённо',experience:3,bio:'Local benchmark fixture',fsp:[],published:true,consent:true};db.prepare('INSERT INTO records VALUES(?,?,?,?,?)').run(id+':profile:me',id,'profile',JSON.stringify(profile),Date.now());}db.exec('COMMIT');
  const latencies=[],bytes=[];const started=performance.now();
  for(let batch=0;batch<10;batch++)await Promise.all(Array.from({length:10},async(_,i)=>{const t=performance.now();const response=await fetch(base+'/api/platform?role=Backend&grade=Middle&strict=1&limit=24&offset='+i*24,{headers:{cookie}});assert.equal(response.status,200);const body=await response.text(),data=JSON.parse(body);assert(data.candidates.length<=24&&data.pagination.total>=600);assert(data.candidates.every(c=>!c.email&&!c.birthDate));latencies.push(performance.now()-t);bytes.push(Buffer.byteLength(body));}));
  latencies.sort((a,b)=>a-b);const report={date:new Date().toISOString(),passed:true,syntheticProfiles:1000,requests:100,concurrency:10,totalMs:performance.now()-started,latencyMs:{median:latencies[49],p95:latencies[94],max:latencies[99]},maxResponseBytes:Math.max(...bytes),limitations:['Local Windows Worker + SQLite, not production SLA','All profiles loaded before in-memory ranking; SQL prefilter remains future work','Synthetic fixture removed after run']};fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{db.prepare('DELETE FROM records WHERE owner LIKE ?').run(prefix+'%');db.prepare('DELETE FROM users WHERE id LIKE ?').run(prefix+'%');db.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
