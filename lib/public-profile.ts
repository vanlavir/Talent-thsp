// Only explicitly allowed fields can cross the candidate/employer boundary.
const fields=['name','role','grade','stack','city','format','experience','score','fsp','bio','verifiedAt','industry','softSkills','portfolio','education','questionnaire'];
export function publicProfile(profile:any){
 const result:any={id:profile.id};
 for(const field of fields)if(profile[field]!==undefined&&profile.visibility?.[field]!==false)result[field]=profile[field];
 return result;
}
