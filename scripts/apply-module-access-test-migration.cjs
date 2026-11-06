// Pinned migration, dedicated Supabase billing TEST project only. Never the catalogue or vault.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {PrismaClient}=require('@prisma/client');
const EXPECTED='7a5045f935a158723cd9803431807d31e3b4168854fbbc39e1f68a0d9ec9b31e';
async function main(){
 const report={checkedAt:new Date().toISOString(),project:'medicea-billing-test',migration:'005_module_access',applied:false};let db;
 try{
  const sql=fs.readFileSync(path.join(__dirname,'../billing/migrations/005_module_access.sql'),'utf8').replace(/\r\n/g,'\n');
  if(crypto.createHash('sha256').update(sql).digest('hex')!==EXPECTED)throw Error('MIGRATION_REVIEW_REQUIRED');
  const ca=process.env.MEDICEA_SUPABASE_CA_FILE;if(!ca||!fs.existsSync(ca))throw Error('TLS_CA_REQUIRED');
  let password=fs.readFileSync(process.argv[2],'utf8').replace(/^\uFEFF/,'').replace(/[\r\n]+$/,'');
  if(!password||/[\r\n]/.test(password))throw Error('INVALID_PASSWORD_FILE');
  const url=new URL('postgresql://aws-0-eu-west-2.pooler.supabase.com:5432/postgres');url.username='postgres.lbfznlncpgopwcuszbhp';url.password=password;password=null;
  url.search=new URLSearchParams({sslmode:'require',sslaccept:'strict',sslcert:ca,connect_timeout:'10',connection_limit:'1'}).toString();
  db=new PrismaClient({datasources:{db:{url:url.toString()}},log:[]});
  await db.$transaction(async tx=>{
   await tx.$queryRawUnsafe('SELECT pg_advisory_xact_lock(72349211)::text');
   const rows=await tx.$queryRawUnsafe("SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='medicea_billing'");
   for(const [table,column] of [['entitlement','external_id'],['search','access_source'],['trial','started_at'],['play_purchase','token']])if(!rows.some(r=>r.table_name===table&&r.column_name===column))throw Error('UNEXPECTED_SCHEMA');
   if(!rows.some(r=>r.table_name==='complimentary_access'))throw Error('UNEXPECTED_SCHEMA');
   if(rows.some(r=>r.table_name==='complimentary_permission'||r.column_name==='full_access'))throw Error('ALREADY_EXISTS_REVIEW_REQUIRED');
   const before=await tx.$queryRawUnsafe("SELECT count(*)::int AS n FROM medicea_billing.complimentary_access WHERE active");
   report.preflightPassed=true;if(!process.argv.includes('--apply-medicea-billing-test'))return;
   const statements=(sql.replace(/^--.*$/gm,'').match(/(?:\$\$[\s\S]*?\$\$|[^;])+/g)||[]).map(s=>s.trim()).filter(s=>s&&!/^(BEGIN|COMMIT)$/i.test(s));
   for(const statement of statements)await tx.$executeRawUnsafe(statement);
   const check=await tx.$queryRawUnsafe("SELECT medicea_billing.member_status('00000000-0000-4000-8000-000000000000'::uuid,NULL::text) AS result");
   if(check[0].result.complimentary!==false)throw Error('VERIFICATION_FAILED');
   report.applied=true;const after=await tx.$queryRawUnsafe("SELECT count(*)::int AS n FROM medicea_billing.complimentary_access WHERE active AND full_access");
   if(before[0].n!==after[0].n)throw Error('VERIFICATION_FAILED');
   report.existingFullGrantsPreserved=true;report.createdTables=['complimentary_permission'];report.existingPaidEntitlementsChanged=false;
  },{timeout:20000});report.migrationSha256=EXPECTED;
 }catch(e){report.errorCategory=typeof e.code==='string'?e.code:(['ALREADY_EXISTS_REVIEW_REQUIRED','UNEXPECTED_SCHEMA','MIGRATION_REVIEW_REQUIRED'].includes(e.message)?e.message:'MIGRATION_UNAVAILABLE');process.exitCode=1;}
 finally{if(db)await db.$disconnect().catch(()=>{});}
 if(process.env.MEDICEA_DB_MIGRATION_REPORT)fs.writeFileSync(process.env.MEDICEA_DB_MIGRATION_REPORT,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}
main().catch(()=>{console.error('Dedicated test migration did not complete');process.exitCode=1;});

