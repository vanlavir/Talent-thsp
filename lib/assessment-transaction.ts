import {database} from './store';

// D1 batch is a transaction: either all three records change or none do.
export async function saveAssessment(owner:string,test:any,result:any){
 const db=database(),date=result.date,key=owner+':result:'+test.id;
 const saved=await db.batch([
  db.prepare(`INSERT OR IGNORE INTO records(id,owner,kind,data,updated)
   SELECT ?,?,'result',?,? WHERE EXISTS(
    SELECT 1 FROM records WHERE owner=? AND kind='test' AND json_extract(data,'$.id')=?
    AND json_extract(data,'$.used')=0 AND json_extract(data,'$.created')>=?)
   AND EXISTS(SELECT 1 FROM records WHERE owner=? AND kind='profile'
    AND json_extract(data,'$.role')=? AND json_extract(data,'$.industry')=?
    AND COALESCE(json_extract(data,'$.lastGradeChange'),0)<=?)`)
   .bind(key,owner,JSON.stringify(result),date,owner,test.id,date-45*60000,owner,test.role,test.industry,date-90*86400000),
  db.prepare(`UPDATE records SET data=json_set(data,'$.used',json('true')),updated=?
   WHERE owner=? AND kind='test' AND json_extract(data,'$.id')=?
   AND EXISTS(SELECT 1 FROM records WHERE id=? AND updated=?)`).bind(date,owner,test.id,key,date),
  db.prepare(`UPDATE records SET data=json_set(data,'$.grade',?,'$.score',?,'$.verifiedAt',?,
   '$.lastGradeChange',?,'$.assessmentVersion',?),updated=? WHERE owner=? AND kind='profile'
   AND EXISTS(SELECT 1 FROM records WHERE id=? AND updated=? AND json_extract(data,'$.passed')=1)`)
   .bind(test.grade,result.score,date,date,test.version,date,owner,key,date)
 ]);
 return Number(saved[0].meta?.changes||0)>0;
}
