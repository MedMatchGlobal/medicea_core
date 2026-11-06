// Metadata-only audit; never prints credentials, URLs or billing/customer rows.
const fs=require('node:fs'),{PrismaClient}=require('@prisma/client');
const host='aws-0-eu-west-2.pooler.supabase.com';
async function main(){
 const report={checkedAt:new Date().toISOString(),readOnly:true,connected:false};let db;
 try{
  let password=fs.readFileSync(process.argv[2],'utf8').replace(/^\uFEFF/,'').replace(/[\r\n]+$/,'');
  if(!password||/[\r\n]/.test(password))throw Error('INVALID_PASSWORD_FILE');
  const url=new URL('postgresql://'+host+':5432/postgres');url.username='postgres.lbfznlncpgopwcuszbhp';url.password=password;
  url.search=new URLSearchParams({sslmode:'require',sslaccept:'strict',connect_timeout:'10',connection_limit:'1'}).toString();
  if(process.env.MEDICEA_SUPABASE_CA_FILE)url.searchParams.set('sslcert',process.env.MEDICEA_SUPABASE_CA_FILE);
  db=new PrismaClient({datasources:{db:{url:url.toString()}},log:[]});password=null;
  const metadata=await db.$transaction(async tx=>{
   await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
   const tables=await tx.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='medicea_billing' ORDER BY table_name`;
   const columns=await tx.$queryRaw`SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema='medicea_billing' ORDER BY table_name,ordinal_position`;
   const routines=await tx.$queryRaw`SELECT routine_name FROM information_schema.routines WHERE routine_schema='medicea_billing' ORDER BY routine_name`;
   return {tables,columns,routines};
  },{timeout:20000});
  report.connected=true;Object.assign(report,metadata);
 }catch(e){
  report.errorCategory=typeof e.code==='string'?e.code:typeof e.errorCode==='string'?e.errorCode:'CONNECTION_CHECK_UNAVAILABLE';
  report.errorType=e.name;
  const message=String(e.message||'');
  report.failureClass=/certificate|TLS|SSL/i.test(message)?'tls':/authentication|password authentication/i.test(message)?'authentication':/reach database|connect|timeout|network/i.test(message)?'network-or-connection':'client-or-query';
  process.exitCode=1;
 }
 finally{if(db)await db.$disconnect().catch(()=>{});}
 if(process.env.MEDICEA_DB_CHECK_REPORT)fs.writeFileSync(process.env.MEDICEA_DB_CHECK_REPORT,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
}
main().catch(()=>{console.error('Read-only database check could not complete');process.exitCode=1;});
