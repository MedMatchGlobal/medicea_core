import {Pool} from 'pg';
import certificate from '../certificates/supabase-ca.json';
import {assertEnabled,ConsoleError} from './policy';
let pool:Pool|undefined;
export function db(){
 assertEnabled();if(pool)return pool;
 const url=new URL(process.env.MEDICEA_CONSOLE_DATABASE_URL||'invalid:');
 if(!url.hostname.endsWith('.pooler.supabase.com')||url.username!=='medicea_console_server.lbfznlncpgopwcuszbhp'||url.pathname!=='/postgres')throw new ConsoleError('DATABASE_UNAVAILABLE',503);
 url.searchParams.delete('sslmode');url.searchParams.delete('pgbouncer');
 pool=new Pool({connectionString:url.toString(),ssl:{rejectUnauthorized:true,ca:certificate.pem},max:3,idleTimeoutMillis:10000,connectionTimeoutMillis:10000,statement_timeout:20000});
 pool.on('error',()=>{});return pool;
}
export async function audit(actor:string,action:string,member:string|null,operation:string|null,details:unknown={}){
 await db().query('INSERT INTO medicea_billing.console_audit(actor_id,action,member_id,operation_id,details) VALUES($1,$2,$3,$4,$5)',[actor,action,member,operation,JSON.stringify(details)]);
}
