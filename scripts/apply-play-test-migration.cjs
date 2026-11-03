// Only the owner's dedicated Supabase billing TEST project. No customer rows are read.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {PrismaClient}=require('@prisma/client');
const EXPECTED='7099f54acf632ef7414bb2393536db2ca374e8c442541a28abcc093a78f84bab';
async function main(){
 const report={checkedAt:new Date().toISOString(),project:'medicea-billing-test',applied:false};
 let db;
 try{
  const sql=fs.readFileSync(path.join(__dirname,'../billing/migrations/003_google_play.sql'),'utf8').replace(/\r\n/g,'\n');
  if(crypto.createHash('sha256').update(sql).digest('hex')!==EXPECTED)throw Error('MIGRATION_REVIEW_REQUIRED');
  const ca=process.env.MEDICEA_SUPABASE_CA_FILE;
  if(!ca||!fs.existsSync(ca))throw Error('TLS_CA_REQUIRED');
  let password=fs.readFileSync(process.argv[2],'utf8').replace(/^\uFEFF/,'').replace(/[\r\n]+$/,'');
  if(!password||/[\r\n]/.test(password))throw Error('INVALID_PASSWORD_FILE');
  const url=new URL('postgresql://aws-0-eu-west-2.pooler.supabase.com:5432/postgres');
  url.username='postgres.lbfznlncpgopwcuszbhp';url.password=password;password=null;
  url.search=new URLSearchParams({sslmode:'require',sslaccept:'strict',sslcert:ca,connect_timeout:'10',connection_limit:'1'}).toString();
  db=new PrismaClient({datasources:{db:{url:url.toString()}},log:[]});
  const apply=process.argv.includes('--apply-medicea-billing-test');
  await db.$transaction(async tx=>{
   await tx.$queryRawUnsafe('SELECT pg_advisory_xact_lock(72349211)::text');
   const rows=await tx.$queryRawUnsafe("SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='medicea_billing'");
   for(const [table,column] of [['entitlement','external_id'],['entitlement','member_id'],['trial','started_at'],['search','access_source']]){
    if(!rows.some(r=>r.table_name===table&&r.column_name===column))throw Error('UNEXPECTED_EXISTING_SCHEMA');
   }
   if(rows.some(r=>r.table_name==='play_purchase'||r.table_name==='play_reconcile_cursor'))throw Error('PLAY_TABLES_ALREADY_EXIST_REVIEW_REQUIRED');
   report.preflightPassed=true;
   if(!apply)return;
   const statements=sql.replace(/^--.*$/gm,'').split(';').map(s=>s.trim()).filter(s=>s&&!/^(BEGIN|COMMIT)$/i.test(s));
   for(const statement of statements)await tx.$executeRawUnsafe(statement);
   const tables=await tx.$queryRawUnsafe("SELECT table_name FROM information_schema.tables WHERE table_schema='medicea_billing' AND table_name IN ('play_purchase','play_reconcile_cursor') ORDER BY table_name");
   if(tables.length!==2)throw Error('MIGRATION_VERIFICATION_FAILED');
   report.createdTables=tables.map(r=>r.table_name);
  },{timeout:20000});
  report.applied=apply;report.migrationSha256=EXPECTED;
 }catch(e){report.errorCategory=typeof e.code==='string'?e.code:'MIGRATION_UNAVAILABLE';process.exitCode=1;}
 finally{if(db)await db.$disconnect().catch(()=>{});}
 if(process.env.MEDICEA_DB_MIGRATION_REPORT)fs.writeFileSync(process.env.MEDICEA_DB_MIGRATION_REPORT,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
}
main().catch(()=>{console.error('Dedicated test migration did not complete');process.exitCode=1;});

