/* Private build-only acceptance. Dedicated test customers; no SMTP; SQL documents roll back. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module'),{randomUUID,createHash}=require('node:crypto'),ts=require('typescript');
const run=process.argv[3];
if(process.argv[2]!=='--dedicated-sandbox'||!/^qa-[a-f0-9-]{36}$/.test(run||'')||process.env.VERCEL_ENV!=='preview'||process.env.VERCEL_PROJECT_ID!=='prj_zIesaaTzLOzNm32TYoEfcv7DQklE')throw Error('PRIVATE_EXPLICIT_SANDBOX_RUN_REQUIRED');
const root=path.resolve(__dirname,'..'),cache=new Map();
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);const native=createRequire(file),local=name=>name.startsWith('@/')?load(path.join(root,name.slice(2))+'.ts'):name.startsWith('.')?load(path.resolve(path.dirname(file),name)+'.ts'):native(name);vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{module,exports:module.exports,require:local,process,fetch,URL,URLSearchParams,Date,Intl,Buffer,Response,AbortSignal,setTimeout,clearTimeout});return module.exports;}
const store=load(path.join(root,'lib/membership/store.ts')),db=store.billingDb(),stripe=load(path.join(root,'lib/membership/stripe.ts')),config=load(path.join(root,'lib/membership/config.ts'));
let activeTx=null,stage='preflight',mailAttempts=0;store.billingDb=()=>activeTx||db;
load(path.join(root,'lib/membership/confirmation-mail.ts')).confirmationMailTransport=()=>{mailAttempts++;throw Error('MAIL_FORBIDDEN');};
const events=load(path.join(root,'lib/membership/stripe-events.ts')),reconcile=load(path.join(root,'lib/membership/stripe-reconcile.ts'));
const results=[],fixtures=[],cleanups=[],rollback=Error('REQUIRED_ROLLBACK');
function check(ok,code){if(!ok)throw Object.assign(Error(code),{acceptanceCode:code});}
const api=(p,fields,key,query)=>stripe.stripeRequest(p,fields?new URLSearchParams(fields):undefined,key,30000,'2026-11-18.endive',query?new URLSearchParams(query):undefined);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function advance(clock,time){await api('/test_helpers/test_clocks/'+clock+'/advance',{frozen_time:String(time)});for(let n=0;n<45;n++){const c=await api('/test_helpers/test_clocks/'+clock);if(c.status==='ready')return;check(c.status==='advancing','CLOCK_ADVANCE_FAILED');await sleep(1000);}throw Error('CLOCK_TIMEOUT');}
async function verify(invoice,fixture,kind){
 const {member,customer,plan}=fixture,amount=plan==='monthly'?299:1999,tax=plan==='monthly'?50:333;
 check(invoice.livemode===false&&invoice.customer===customer&&invoice.status==='paid'&&invoice.total===amount&&invoice.amount_paid===amount&&invoice.automatic_tax?.status==='complete','PAID_TAX_INVOICE_REQUIRED');
 check(invoice.billing_reason===(kind==='renewal'?'subscription_cycle':'subscription_create'),'INVOICE_REASON_MISMATCH');
 const key='stripe:'+kind+':'+invoice.id,email='confirmation-'+member+'@example.test';
 try{await db.$transaction(async tx=>{
  activeTx={$queryRaw:(p,...v)=>tx.$queryRaw(p,...v),$executeRaw:(p,...v)=>tx.$executeRaw(p,...v),$transaction:fn=>fn(activeTx)};
  await tx.$executeRaw`INSERT INTO auth.users(id,email,email_confirmed_at,aud,role,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) VALUES(${member}::uuid,${email},now(),'authenticated','authenticated','{}'::jsonb,'{}'::jsonb,now(),now())`;
  const event={livemode:false,type:'invoice.paid',created:invoice.status_transitions.paid_at,data:{object:invoice}};
  check((await events.processStripeEvent(event)).ok,'PROCESSOR_FIRST_EVENT_FAILED');
  const rows=await tx.$queryRaw`SELECT id::text,snapshot,body,recipient,state FROM medicea_billing.purchase_confirmation WHERE provider_key=${key}`;
  check(rows.length===1,'ONE_CONFIRMATION_REQUIRED');const row=rows[0],s=row.snapshot,line=invoice.lines.data[0];
  check(s.kind===kind&&s.plan===plan&&s.currency==='GBP'&&s.amountMinor===amount&&s.taxMinor===tax&&s.renewalAmountMinor===amount&&row.recipient===email&&row.state==='pending','CONFIRMATION_AMOUNTS_OR_BINDING_MISMATCH');
  check(s.startsAt===new Date(line.period.start*1000).toISOString()&&s.endsAt===new Date(line.period.end*1000).toISOString(),'ACTUAL_PROVIDER_PERIOD_REQUIRED');
  check(/(?:GMT|BST) \(London time\)/.test(row.body)&&row.body.includes('support@medicea.global'),'LONDON_TIME_AND_SUPPORT_REQUIRED');
  check((await events.processStripeEvent(event)).ok,'REPLAY_FAILED');
  const replay=await tx.$queryRaw`SELECT id::text,body FROM medicea_billing.purchase_confirmation WHERE provider_key=${key}`;
  check(replay.length===1&&replay[0].id===row.id&&replay[0].body===row.body,'IMMUTABLE_SINGLE_REPLAY_REQUIRED');
  const entitlement=await tx.$queryRaw`SELECT active FROM medicea_billing.entitlement WHERE member_id=${member}::uuid AND external_id=${fixture.subscription}`;
  check(entitlement.length===1&&entitlement[0].active,'PAID_ENTITLEMENT_REQUIRED');
  results.push({plan,kind,invoice:invoice.id,amountMinor:amount,taxMinor:tax,currency:'GBP',startsAt:s.startsAt,endsAt:s.endsAt,duplicateDocumentCount:1,bodyHash:createHash('sha256').update(row.body).digest('hex')});throw rollback;
 },{timeout:90000,maxWait:10000});}catch(error){if(error!==rollback)throw error;}finally{activeTx=null;}
 const persisted=await db.$queryRaw`SELECT (SELECT count(*)::int FROM auth.users WHERE id=${member}::uuid) AS accounts,(SELECT count(*)::int FROM medicea_billing.purchase_confirmation WHERE provider_key=${key}) AS documents`;
 check(persisted[0].accounts===0&&persisted[0].documents===0&&mailAttempts===0,'ROLLBACK_OR_NO_MAIL_FAILED');
}
async function cleanup(f){
 const customer=await api('/customers/'+f.customer);check(customer.livemode===false&&customer.metadata?.qa_run===run&&customer.metadata.member_id===f.member,'CLEANUP_QA_CUSTOMER_REQUIRED');
 const subs=await api('/subscriptions',null,null,{customer:f.customer,status:'all',limit:'100'});check(!subs.has_more,'CLEANUP_SUBS_PAGINATION');
 for(const sub of subs.data){check(sub.livemode===false&&sub.customer===f.customer&&sub.metadata?.qa_run===run,'CLEANUP_QA_SUB_REQUIRED');if(sub.status!=='canceled'){
  const response=await fetch('https://api.stripe.com/v1/subscriptions/'+sub.id,{method:'DELETE',headers:{Authorization:'Bearer '+config.stripeTestKey(),'Stripe-Version':'2026-11-18.endive'},signal:AbortSignal.timeout(30000)});check(response.ok,'QA_CANCEL_FAILED');const canceled=await response.json();check(canceled.status==='canceled'&&canceled.livemode===false,'QA_CANCEL_NOT_CONFIRMED');
 }}
 const charges=await api('/charges',null,null,{customer:f.customer,limit:'100'});check(!charges.has_more,'CLEANUP_CHARGES_PAGINATION');let refunded=0;
 for(const charge of charges.data){check(charge.livemode===false&&charge.customer===f.customer,'QA_CHARGE_REQUIRED');if(charge.paid&&charge.amount_refunded<charge.amount)await api('/refunds',{charge:charge.id,'metadata[qa_run]':run},run+'-refund-'+charge.id);const final=await api('/charges/'+charge.id);check(!final.paid||final.amount_refunded===final.amount,'QA_FULL_REFUND_REQUIRED');refunded+=final.amount_refunded;}
 await reconcile.reconcileStripeCustomer(f.customer);
 const ledger=await db.$queryRaw`SELECT count(*)::int AS count FROM medicea_billing.entitlement WHERE member_id=${f.member}::uuid AND active`;
 check(ledger[0].count===0,'QA_ACCESS_MUST_BE_INACTIVE');cleanups.push({customer:f.customer,plan:f.plan,subscriptionsCanceled:subs.data.length,chargesFullyRefunded:charges.data.length,refundedMinor:refunded,activeAccess:0});
}
(async()=>{
 process.env.MEDICEA_CONFIRMATIONS_PREVIEW='true';process.env.MEDICEA_CONFIRMATIONS_FROM_EPOCH='1795392000';config.stripeTestKey();
 for(const plan of ['monthly','annual']){
  stage=plan+'_create_fixture';const member=randomUUID(),price=await stripe.validatePrice(plan,'GBP',true),clock=await api('/test_helpers/test_clocks',{frozen_time:String(Math.floor(Date.now()/1000)),name:run+'-'+plan},run+'-clock-'+plan);
  const c=await api('/customers',{test_clock:clock.id,name:'medicea isolated recurring QA','address[line1]':'1 Test Street','address[city]':'London','address[postal_code]':'SW1A 1AA','address[country]':'GB','metadata[member_id]':member,'metadata[qa_run]':run},run+'-customer-'+plan);check(c.livemode===false&&!c.email,'EMAILLESS_TEST_CUSTOMER_REQUIRED');
  const fixture={plan,member,customer:c.id,clock:clock.id};fixtures.push(fixture);
  await db.$executeRaw`INSERT INTO medicea_billing.stripe_customer(member_id,customer_id) VALUES(${member}::uuid,${c.id})`;
  const setup=await api('/setup_intents',{customer:c.id,payment_method:'pm_card_visa',confirm:'true',usage:'off_session','automatic_payment_methods[enabled]':'true','automatic_payment_methods[allow_redirects]':'never'},run+'-setup-'+plan);check(setup.status==='succeeded'&&setup.livemode===false,'TEST_SETUP_REQUIRED');
  const sub=await api('/subscriptions',{customer:c.id,default_payment_method:setup.payment_method,'items[0][price]':price,'items[0][quantity]':'1',payment_behavior:'error_if_incomplete','automatic_tax[enabled]':'true','metadata[member_id]':member,'metadata[qa_run]':run},run+'-subscription-'+plan);check(sub.livemode===false&&sub.status==='active','ACTIVE_TEST_SUB_REQUIRED');fixture.subscription=sub.id;
  stage=plan+'_initial_confirmation';await verify(await api('/invoices/'+sub.latest_invoice),fixture,'purchase');
  stage=plan+'_renewal_clock';const end=sub.items.data[0].current_period_end;await advance(clock.id,end);await advance(clock.id,end+7200);
  const renewed=await api('/subscriptions/'+sub.id);check(renewed.latest_invoice!==sub.latest_invoice,'NEW_RENEWAL_INVOICE_REQUIRED');
  stage=plan+'_renewal_confirmation';await verify(await api('/invoices/'+renewed.latest_invoice),fixture,'renewal');
 }
})().catch(error=>{console.error('MEDICEA_RECURRING_FAILED '+JSON.stringify({stage,code:error.acceptanceCode||error.code||error.message||'VALIDATION_ERROR',...(error.status?{status:error.status,parameter:error.parameter}:{} )}));process.exitCode=1;}).finally(async()=>{
 for(const f of fixtures)try{await cleanup(f);}catch(error){console.error('MEDICEA_QA_CLEANUP_FAILED '+JSON.stringify({customer:f.customer,code:error.acceptanceCode||error.code||'CLEANUP_ERROR'}));process.exitCode=1;}
 console.log('MEDICEA_RECURRING_ACCEPTANCE '+JSON.stringify({passed:!process.exitCode,run,results,cleanups,emailsSent:0,mailAttempts,persistentAuthAccounts:0,persistentConfirmationDocuments:0,scope:'actual sandbox subscriptions, paid initial and test-clock renewal invoices; actual processor + snapshot + hosted SQL + duplicate replay; rollback-only synthetic verified recipient; not HTTP signature, signup, checkout UI or inbox acceptance'}));await db.$disconnect();
});
