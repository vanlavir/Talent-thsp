import {mailReady} from '@/lib/mail';
import Workspace from './workspace';
import AuthForm from './auth-form';
import {getUser} from '@/lib/auth';
export const dynamic='force-dynamic';
export default async function Home(){try{const user=await getUser();return user&&mailReady()&&!user.emailVerified?<AuthForm mailAvailable pendingEmail={user.email}/>:user?<Workspace email={user.email} username={user.username} accountRole={user.role} emailVerified={user.emailVerified} mailAvailable={mailReady()}/>:<AuthForm mailAvailable={mailReady()}/>;}catch{return <main className="welcome"><h1>Сервис временно недоступен</h1><p>Не удалось подключиться к базе. Попробуйте обновить страницу позже.</p></main>;}}
