import {env} from 'cloudflare:workers';
import {digest,limit} from '@/lib/auth';
import {sendMailru,MailTransportError} from '@/lib/mailru';
export const dynamic='force-dynamic';
/** Temporary deployment check. Disabled when MAIL_SETUP_TOKEN is removed. Sends only to sender. */
export async function POST(req:Request){const e=env as any,token=req.headers.get('authorization')?.replace(/^Bearer /,'');
 if(!e.MAIL_SETUP_TOKEN||!token||await digest(token)!==await digest(e.MAIL_SETUP_TOKEN))return Response.json({error:'Недоступно'},{status:403});
 if(!e.MAILRU_USER||!e.MAILRU_PASSWORD)return Response.json({error:'Отправитель не настроен'},{status:503});
 if(!await limit('mail-setup',3,86400000))return Response.json({error:'Лимит проверок'},{status:429});
 try{await sendMailru(e.MAILRU_USER,e.MAILRU_PASSWORD,e.MAILRU_USER,'000000');return Response.json({accepted:true,recipient:e.MAILRU_USER,note:'Тестовое письмо. Код 000000 не подтверждает аккаунт.'});}catch(error){return Response.json({accepted:false,stage:error instanceof MailTransportError?error.stage:'connection',smtpCode:error instanceof MailTransportError?error.smtpCode:undefined},{status:503});}
}
