import {connect} from 'cloudflare:sockets';

export class MailTransportError extends Error{constructor(public stage:string,public smtpCode?:number){super('Почтовый сервер не принял письмо');}}
const address=/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$/;
export function validMailAddress(value:unknown):value is string{return typeof value==='string'&&value.length<=254&&address.test(value);}
function base64(text:string){const bytes=new TextEncoder().encode(text);return btoa(Array.from(bytes,b=>String.fromCharCode(b)).join(''));}
export function mailMessage(from:string,to:string,code:string){
 if(!validMailAddress(from)||!validMailAddress(to)||!/^\d{6}$/.test(code))throw new MailTransportError('validation');
 const content=base64(`Код подтверждения: ${code}\n\nОн действует 15 минут. Введите его на сайте ФСП Talent.\nЕсли вы не регистрировались, проигнорируйте письмо.`).match(/.{1,76}/g)!.join('\r\n');
 return [`From: =?UTF-8?B?${base64('ФСП Talent')}?= <${from}>`,`To: <${to}>`,`Subject: =?UTF-8?B?${base64('ФСП Talent — подтверждение почты')}?=`,`Date: ${new Date().toUTCString()}`,`Message-ID: <${crypto.randomUUID()}@${from.split('@')[1]}>`,'MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',content].join('\r\n');
}

/** Fixed Mail.ru endpoint, implicit TLS. No arbitrary SMTP hosts or plain-text fallback. */
export async function sendMailru(user:string,password:string,to:string,code:string){
 const message=mailMessage(user,to,code);
 if(!password||password.length>256||/[\r\n\x00]/.test(password))throw new MailTransportError('configuration');
 const socket=connect({hostname:'smtp.mail.ru',port:465},{secureTransport:'on'});
 const reader=socket.readable.getReader(),writer=socket.writable.getWriter(),decoder=new TextDecoder();
 let buffer='',stage='connection';
 // One total deadline covers connection, auth and message acknowledgement.
 let timer:ReturnType<typeof setTimeout>;
 const timeout=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{void socket.close().catch(()=>{});reject(new MailTransportError('timeout'));},20000);});
 socket.closed.catch(()=>{});
 async function line(){for(;;){const end=buffer.indexOf('\r\n');if(end>=0){const result=buffer.slice(0,end);buffer=buffer.slice(end+2);return result;}if(buffer.length>16384)throw new MailTransportError('protocol');const chunk=await reader.read();if(chunk.done)throw new MailTransportError(stage);buffer+=decoder.decode(chunk.value,{stream:true});}}
 async function reply(expected:number[]){const lines:string[]=[];let responseCode=0;for(let count=0;count<100;count++){const value=await line();const match=/^(\d{3})([ -])(.*)$/.exec(value);if(!match)throw new MailTransportError('protocol');const code=Number(match[1]);if(responseCode&&code!==responseCode)throw new MailTransportError('protocol');responseCode=code;lines.push(match[3]);if(match[2]===' '){if(!expected.includes(code))throw new MailTransportError(stage,code);return {code,text:lines.join('\n')};}}throw new MailTransportError('protocol');}
 async function command(value:string,expected:number[]){await writer.write(new TextEncoder().encode(value+'\r\n'));return reply(expected);}
 async function run(){await socket.opened;stage='greeting';await reply([220]);stage='ehlo';const greeting=await command('EHLO fsp-talent.local',[250]);if(!/^AUTH(?:=|\s).*\bLOGIN\b/im.test(greeting.text))throw new MailTransportError('authentication-method');stage='authentication';await command('AUTH LOGIN',[334]);await command(base64(user),[334]);await command(base64(password),[235]);stage='sender';await command(`MAIL FROM:<${user}>`,[250]);stage='recipient';await command(`RCPT TO:<${to}>`,[250,251]);stage='data';await command('DATA',[354]);stage='acknowledgement';await command(message+'\r\n.',[250]);
  // Accepted means SMTP queued the message, not proof of inbox delivery.
  void writer.write(new TextEncoder().encode('QUIT\r\n')).catch(()=>{});
 }
 try{await Promise.race([run(),timeout]);}catch(e){if(e instanceof MailTransportError)throw e;throw new MailTransportError(stage);}finally{clearTimeout(timer!);await socket.close().catch(()=>{});reader.releaseLock();writer.releaseLock();}
}
