// Production SMTP module tested with split replies, errors and no external mail.
const fs=require('fs'),ts=require('typescript'),path=require('path'),assert=require('assert');
let mode='ok',writes=[],connections=0,closed=false;
function connect(address,options){connections++;assert.deepEqual(address,{hostname:'smtp.mail.ru',port:465});assert.equal(options.secureTransport,'on');let controller,phase=0;
 function enqueue(s){for(const chunk of [s.slice(0,4),s.slice(4)])if(chunk)controller.enqueue(new TextEncoder().encode(chunk));}
 return {opened:Promise.resolve({}),closed:Promise.resolve(),readable:new ReadableStream({start(c){controller=c;enqueue('220 mail.ru ready\r\n');}}),writable:new WritableStream({write(bytes){const text=new TextDecoder().decode(bytes);writes.push(text);if(text==='QUIT\r\n')return;const replies=['250-mail.ru\r\n250-AUTH LOGIN PLAIN\r\n250 SIZE 52428800\r\n','334 user\r\n','334 password\r\n',mode==='auth-error'?'535 denied\r\n':'235 accepted\r\n','250 sender\r\n',mode==='recipient-error'?'550 rejected\r\n':'250 recipient\r\n','354 data\r\n','250 queued\r\n'];enqueue(replies[phase++]);}}),async close(){if(!closed){closed=true;controller.close();}}};
}
const name=path.resolve(__dirname,'../lib/mailru.ts'),source=ts.transpileModule(fs.readFileSync(name,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,m={exports:{}};
new Function('exports','require','module',source)(m.exports,p=>{if(p==='cloudflare:sockets')return {connect};throw Error('Unexpected dependency');},m);
(async()=>{
 await m.exports.sendMailru('sender@mail.ru','dummy-app-password','recipient@example.test','123456');assert(closed);assert.equal(writes[0],'EHLO fsp-talent.local\r\n');const message=writes.find(v=>v.startsWith('From:'));assert(message);const body=message.split('\r\n\r\n')[1].replace(/\r\n\.\r\n$/,'').replace(/\r\n/g,'');assert(Buffer.from(body,'base64').toString('utf8').includes('123456'));
 const count=connections;await assert.rejects(()=>m.exports.sendMailru('sender@mail.ru','dummy','victim@example.test\r\nBcc: other@example.test','123456'));assert.equal(connections,count);
 for(const [failure,stage] of [['auth-error','authentication'],['recipient-error','recipient']]){mode=failure;writes=[];closed=false;await assert.rejects(()=>m.exports.sendMailru('sender@mail.ru','dummy','recipient@example.test','123456'),e=>e.stage===stage&&!e.message.includes('dummy'));assert(!writes.some(v=>v.startsWith('From:')));assert(closed);}
 console.log('SMTP checks passed: implicit TLS, fragmented/multiline replies, MIME Cyrillic, injection rejection, auth/recipient failure, cleanup. No real emails sent.');
})().catch(e=>{console.error(e);process.exitCode=1});
