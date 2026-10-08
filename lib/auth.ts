import {mailReady} from './mail';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {database,read} from './store';
export const SESSION_COOKIE='fsp_session';
export const SESSION_SECONDS=7*24*60*60;
export type User={userId:string;username:string;email:string;role:'candidate'|'employer';emailVerified?:boolean};
export async function digest(value:string){const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');}
export function randomToken(){return Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');}
export async function getUser():Promise<User|null>{const token=(await cookies()).get(SESSION_COOKIE)?.value;if(!token||!/^\w{64}$/.test(token))return null;const row=await database().prepare('SELECT u.id AS userId, u.username, u.email, u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>?').bind(await digest(token),Date.now()).first<User>();if(!row)return null;const v=await read(row.userId,'emailVerification','main');return {...row,emailVerified:!!v?.verified&&v.email===row.email};}
export async function requireUser(){const user=await getUser();if(!user||(mailReady()&&!user.emailVerified))redirect('/');return user;}
export function sessionCookie(token:string,url:string,maxAge=SESSION_SECONDS){return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${new URL(url).protocol==='https:'?'; Secure':''}`;}
export async function limit(key:string,max:number,windowMs:number){const now=Date.now();const row=await database().prepare('INSERT INTO auth_limits (key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN auth_limits.expires<=? THEN 1 ELSE auth_limits.count+1 END,expires=CASE WHEN auth_limits.expires<=? THEN excluded.expires ELSE auth_limits.expires END RETURNING count').bind(await digest(key),now+windowMs,now,now).first<{count:number}>();return !!row&&row.count<=max;}
