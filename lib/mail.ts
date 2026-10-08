import {env} from 'cloudflare:workers';
export function mailReady(){const e=env as any;if(e.MAIL_PROVIDER==='mailru')return e.MAILRU_ENABLED==='true'&&!!e.MAILRU_USER&&!!e.MAILRU_PASSWORD;return !!e.RESEND_API_KEY&&!!e.MAIL_FROM;}
export async function sendVerification(email:string,code:string){
 if(!mailReady())throw new Error('Почтовый сервис не подключён');
 if((env as any).MAIL_PROVIDER==='mailru'){const {sendMailru}=await import('./mailru');await sendMailru((env as any).MAILRU_USER,(env as any).MAILRU_PASSWORD,email,code);return;}
 const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+(env as any).RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:(env as any).MAIL_FROM,to:[email],subject:'ФСП Talent — подтверждение почты',text:`Код подтверждения: ${code}\nОн действует 15 минут. Если вы не регистрировались, проигнорируйте письмо.`}),signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw new Error('Не удалось отправить письмо. Попробуйте позже.');
}
