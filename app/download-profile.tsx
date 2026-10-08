'use client';
import {useState} from 'react';
import {Download} from 'lucide-react';
export default function DownloadProfile({profile}:{profile:any}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function download(){setBusy(true);setError('');try{
  const [{createProfilePdf},fonts]=await Promise.all([import('@/lib/profile-pdf'),Promise.all(['Regular','Bold'].map(async weight=>{const r=await fetch(`/fonts/PTSans-${weight}.ttf`);if(!r.ok)throw Error('Не удалось загрузить оформление PDF');return new Uint8Array(await r.arrayBuffer());}))]);
  const bytes=await createProfilePdf(profile,fonts[0],fonts[1]);const blob=new Blob([new Uint8Array(bytes)],{type:'application/pdf'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='fsp-talent-profile.pdf';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
 }catch{setError('Не удалось создать PDF. Попробуйте ещё раз.');}finally{setBusy(false);}}
 return <><button type="button" className="secondary" disabled={busy} onClick={download}><Download size={16}/>{busy?'Создаём PDF…':'Скачать PDF-профиль'}</button><small className="muted">Из сохранённых данных профиля</small>{error&&<p role="alert">{error}</p>}</>;
}
