import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
import {assertEnabled,ConsoleError,ownerIdentity,requireMfa} from './policy';
export async function consoleAuth(){
 assertEnabled();const jar=await cookies(),url=process.env.MEDICEA_CONSOLE_AUTH_URL,key=process.env.MEDICEA_CONSOLE_AUTH_KEY;
 if(!url||!key||new URL(url).hostname!=='lbfznlncpgopwcuszbhp.supabase.co')throw new ConsoleError('AUTH_UNAVAILABLE',503);
 return createServerClient(url,key,{cookieOptions:{name:'medicea-owner-console',httpOnly:true,secure:process.env.NODE_ENV!=='development',sameSite:'strict',path:'/'},cookies:{getAll:()=>jar.getAll(),setAll:values=>values.forEach(({name,value,options})=>jar.set(name,value,options))}});
}
export async function ownerSession(mfa=true){
 const client=await consoleAuth();const {data,error}=await client.auth.getUser();
 if(error||!data.user)throw new ConsoleError('SIGN_IN_REQUIRED',401);
 const user=ownerIdentity(data.user);
 if(mfa){const verified=await client.auth.getClaims();if(verified.error)throw new ConsoleError('MFA_REQUIRED',403);requireMfa(verified.data?.claims,user);}
 return {client,user};
}
