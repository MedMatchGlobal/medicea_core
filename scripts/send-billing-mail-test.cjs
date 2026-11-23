// Private and explicitly authorized one-message delivery test. No HTTP endpoint.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module'),ts=require('typescript');
const id=process.argv[2];
if(process.env.VERCEL_ENV!=='preview'||process.env.VERCEL_PROJECT_ID!=='prj_zIesaaTzLOzNm32TYoEfcv7DQklE'||!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(id||''))throw Error('EXPLICIT_PRIVATE_DELIVERY_TEST_REQUIRED');
process.env.MEDICEA_CONFIRMATIONS_PREVIEW='true';
const cache=new Map(),root=path.resolve(__dirname,'..');
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);const native=createRequire(file),local=name=>name.startsWith('.')?load(path.resolve(path.dirname(file),name)+'.ts'):native(name);vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{module,exports:module.exports,require:local,process,fetch,URL,URLSearchParams,Date,Intl,Buffer,Response,AbortSignal,setTimeout,clearTimeout});return module.exports;}
const {billingDb}=load(path.join(root,'lib/membership/store.ts')),{deliverConfirmations}=load(path.join(root,'lib/membership/confirmations.ts'));
(async()=>{
 const key='mail-delivery-test:'+id,to='sergio@medicea.global';
 const existing=await billingDb().$queryRaw`SELECT state,recipient FROM medicea_billing.purchase_confirmation WHERE provider_key=${key}`;
 if(existing.length){if(existing[0].state==='sent'){console.log('MEDICEA_TEST_MAIL_ALREADY_ACCEPTED no_resend=true');return;}throw Error('EXISTING_TEST_OUTCOME_REQUIRES_REVIEW');}
 const other=await billingDb().$queryRaw`SELECT count(*)::int AS count FROM medicea_billing.purchase_confirmation WHERE state IN ('pending','processing')`;
 if(other[0].count!==0)throw Error('OTHER_PENDING_MAIL_TEST_ABORTED');
 const time=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',timeZoneName:'short'}).format(new Date());
 const body='TEST EMAIL — medicéa billing delivery check\n\nThis is the single email-delivery test you requested.\nNo purchase was made. No payment was taken. No subscription or account access changed.\n\nSender: billing@medicea.global\nReplies: support@medicea.global\nLondon time: '+time+'\n\nThe attached text copy tests retainable confirmation attachments.\nThis is not a purchase confirmation or VAT invoice.\n';
 await billingDb().$executeRaw`INSERT INTO medicea_billing.purchase_confirmation(provider_key,member_id,recipient,snapshot,body) VALUES(${key},${id}::uuid,${to},${JSON.stringify({version:'2026-11-23',kind:'delivery_test',noPurchase:true})}::jsonb,${body})`;
 const pending=await billingDb().$queryRaw`SELECT provider_key FROM medicea_billing.purchase_confirmation WHERE state='pending'`;
 if(pending.length!==1||pending[0].provider_key!==key)throw Error('UNEXPECTED_PENDING_MAIL_TEST_ABORTED');
 await deliverConfirmations();
 const result=await billingDb().$queryRaw`SELECT state,accepted_at FROM medicea_billing.purchase_confirmation WHERE provider_key=${key}`;
 if(result[0]?.state!=='sent')throw Error('TEST_MAIL_REQUIRES_REVIEW');
 console.log('MEDICEA_TEST_MAIL_ACCEPTED '+JSON.stringify({test:id,accepted:1,automaticCustomerMailEnabled:false,inboxDelivery:'awaiting owner confirmation'}));
})().catch(error=>{console.error('MEDICEA_TEST_MAIL_UNVERIFIED '+(['EXISTING_TEST_OUTCOME_REQUIRES_REVIEW','OTHER_PENDING_MAIL_TEST_ABORTED','UNEXPECTED_PENDING_MAIL_TEST_ABORTED','TEST_MAIL_REQUIRES_REVIEW'].includes(error.message)?error.message:['EAUTH','ESOCKET','ETIMEDOUT','ECONNECTION'].includes(error.code)?error.code:'TEST_DELIVERY_ERROR'));process.exitCode=1;}).finally(async()=>{await billingDb().$disconnect();});
