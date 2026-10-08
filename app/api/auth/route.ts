import {z} from 'zod';
import bcrypt from 'bcryptjs';
import {cookies} from 'next/headers';
import {database,statement} from '@/lib/store';
import {getUser,digest,randomToken,sessionCookie,SESSION_COOKIE,SESSION_SECONDS,limit} from '@/lib/auth';
export const dynamic='force-dynamic';
const loginSchema=z.object({action:z.literal('login'),username:z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,32}$/),password:z.string().min(1).max(72)});
const registerSchema=z.object({action:z.literal('register'),username:z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,32}$/),email:z.string().trim().toLowerCase().email().max(254),password:z.string().min(12).max(72),role:z.enum(['candidate','employer'])});
function reply(data:any,status=200,cookie?:string){return Response.json(data,{status,headers:{'Cache-Control':'no-store',...(cookie?{'Set-Cookie':cookie}:{})}});}
const denied=()=>reply({error:'Неверный логин или пароль'},401);
// Dummy hash keeps the same bcrypt verification path for an unknown login.
const dummy='$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxNkFC6fZZL4sdT0Ns/kVKu/v5O';
export async function GET(){try{return reply({user:await getUser()});}catch{return reply({error:'Не удалось проверить сессию'},503);}}
export async function POST(req:Request){try{
 if(req.headers.get('origin')!==new URL(req.url).origin)return reply({error:'Недопустимый источник запроса'},403);
 const text=await req.text();if(new TextEncoder().encode(text).length>8192)return reply({error:'Слишком большой запрос'},413);
 let raw:any;try{raw=JSON.parse(text);}catch{return reply({error:'Некорректный запрос'},400);}
 if(raw.action==='logout'){const token=(await cookies()).get(SESSION_COOKIE)?.value;if(token)await database().prepare('DELETE FROM sessions WHERE token_hash=?').bind(await digest(token)).run();return reply({ok:true},200,sessionCookie('',req.url,0));}
 const registration=raw.action==='register';const parsed=(registration?registerSchema:loginSchema).safeParse(raw);
 if(!parsed.success||new TextEncoder().encode(raw.password||'').length>72)return reply({error:registration?'Логин: 3–32 латинских буквы, цифры или _. Укажите почту и пароль от 12 символов (до 72 байт).':'Проверьте логин и пароль'},400);
 const b=parsed.data;const ip=req.headers.get('cf-connecting-ip')||'local';
 if(!await limit('auth-ip:'+ip,40,15*60000)||!await limit('auth-login:'+b.username,12,15*60000))return reply({error:'Слишком много попыток. Попробуйте через 15 минут.'},429);
 let userId:string;
 if(registration){const r=registerSchema.parse(b);const found=await database().prepare('SELECT id FROM users WHERE username=? OR email=?').bind(r.username,r.email).first();if(found)return reply({error:'Логин или почта уже зарегистрированы'},409);
 userId=crypto.randomUUID();const hash=await bcrypt.hash(r.password,12);
 try{await database().batch([database().prepare('INSERT INTO users (id,username,email,password_hash,role,created) VALUES (?,?,?,?,?,?)').bind(userId,r.username,r.email,hash,r.role,Date.now()),statement(userId,'settings',{id:'main',role:r.role})]);}catch(e){if(String(e).includes('UNIQUE'))return reply({error:'Логин или почта уже зарегистрированы'},409);throw e;}
 }else{const row=await database().prepare('SELECT id,password_hash FROM users WHERE username=?').bind(b.username).first<{id:string;password_hash:string}>();const valid=await bcrypt.compare(b.password,row?.password_hash||dummy);if(!row||!valid)return denied();userId=row.id;}
 const token=randomToken();await database().batch([database().prepare('DELETE FROM sessions WHERE expires<=?').bind(Date.now()),database().prepare('INSERT INTO sessions (token_hash,user_id,expires) VALUES (?,?,?)').bind(await digest(token),userId,Date.now()+SESSION_SECONDS*1000)]);
 return reply({ok:true},registration?201:200,sessionCookie(token,req.url));
 }catch(e){console.error('Authentication storage operation failed',e instanceof Error?e.name:'error');return reply({error:'Сервис входа временно недоступен. Попробуйте ещё раз.'},503);}}
