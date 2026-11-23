/* Private, explicitly invoked sandbox acceptance. Never part of normal builds or an HTTP route. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto'),{createRequire}=require('node:module'),ts=require('typescript');
const run=process.argv[2];
if(!/^console-qa-[a-f0-9-]{36}$/.test(run||'')||process.env.VERCEL_ENV!=='preview'||process.env.VERCEL_PROJECT_ID!=='prj_lRTMdtM28c2vCyVHQTjxgvrOzQ8O'||process.env.MEDICEA_CONSOLE_SANDBOX!=='true')throw Error('EXPLICIT_PRIVATE_SANDBOX_RUN_REQUIRED');
const root=path.resolve(__dirname,'..'),cache=new Map();
function load(file){
 file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;
 if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(file,'utf8'));
 assert(file.startsWith(root+path.sep));const module={exports:{}};cache.set(file,module);const native=createRequire(file);
 const local=name=>name.startsWith('.')?load(path.resolve(path.dirname(file),name)+(name.endsWith('.json')?'':'.ts')):native(name);
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{module,exports:module.exports,require:local,process,fetch,URL,URLSearchParams,Date,AbortSignal,Buffer,setTimeout,clearTimeout},{filename:file});return module.exports;
}
function uuid(label){const h=createHash('sha256').update(run+':'+label).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;}
const member=uuid('member'),actor=uuid('automated-qa-actor'),{stripe}=load(path.join(root,'lib/stripe.ts')),{db}=load(path.join(root,'lib/db.ts')),{performOperation}=load(path.join(root,'lib/operations.ts'));
const form=object=>new URLSearchParams(Object.entries(object).map(([k,v])=>[k,String(v)]));
let stage='preflight',customer,sessionId;const fixtures=[];
function check(value,label){if(!value)throw Error('CHECK_FAILED_'+label);}
const op=(label,action,amountMinor,extra={})=>({operationId:uuid(label),member,action,amountMinor,currency:'GBP',reason:'Automated dedicated sandbox acceptance '+run,confirmed:true,...extra});
async function fixture(label,amount){
 const pi=await stripe('/payment_intents',form({customer:customer.id,amount,currency:'gbp',payment_method:'pm_card_visa',confirm:true,'automatic_payment_methods[enabled]':true,'automatic_payment_methods[allow_redirects]':'never','metadata[console_acceptance]':run}),run+'-'+label);
 check(pi.livemode===false&&pi.status==='succeeded'&&pi.amount===amount&&pi.customer===customer.id&&/^ch_[A-Za-z0-9]+$/.test(pi.latest_charge),'fixture_payment');fixtures.push(pi.latest_charge);return pi.latest_charge;
}
async function main(){
 // Read before enabling tax: preserve the owner's existing settings and registrations.
 const settings=await stripe('/tax/settings'),registrations=await stripe('/tax/registrations',undefined,undefined,form({status:'active',limit:100}));
 check(settings.status==='active'&&registrations.data.some(r=>r.country==='GB'&&r.active_from<=Date.now()/1000&&(!r.expires_at||r.expires_at>Date.now()/1000)),'active_GB_tax_registration');
 customer=await stripe('/customers',form({name:'Console sandbox acceptance customer',email:run+'@example.test','address[line1]':'1 Test Street','address[city]':'London','address[postal_code]':'SW1A 1AA','address[country]':'GB','metadata[member_id]':member,'metadata[console_acceptance]':run}),run+'-customer');
 check(customer.livemode===false&&customer.metadata?.member_id===member&&customer.metadata?.console_acceptance===run,'fixture_customer');
 await db().query('INSERT INTO medicea_billing.stripe_customer(member_id,customer_id) VALUES($1,$2) ON CONFLICT(member_id) DO NOTHING',[member,customer.id]);
 stage='payment_request';
 const request=op('payment-request','payment_request',299,{description:'QA one-off payment request; no app access'});
 const first=await performOperation(actor,request);sessionId=first.providerRef;const repeat=await performOperation(actor,request);check(repeat.providerRef===sessionId,'payment_request_retry');
 const session=await stripe('/checkout/sessions/'+sessionId,undefined,undefined,new URLSearchParams({'expand[]':'line_items.data.taxes'}));
 check(session.livemode===false&&session.status==='open'&&session.payment_status==='unpaid'&&session.customer===customer.id&&session.amount_total===299&&session.total_details?.amount_tax===50&&session.automatic_tax?.enabled===true&&session.automatic_tax?.status==='complete'&&session.metadata?.console_policy==='customer-approved-payment-request-v1','checkout_inclusive_VAT');
 const before=await stripe('/charges',undefined,undefined,form({customer:customer.id,limit:10}));check(before.data.length===0,'request_did_not_charge');
 const expired=await stripe('/checkout/sessions/'+sessionId+'/expire',form({}),run+'-expire');check(expired.status==='expired','unused_checkout_expired');
 console.log('CONSOLE_QA_STAGE payment_request_passed total=299 VAT=50 GBP no_charge=true retry_same_session=true expired=true');
 stage='partial_refund';const charge=await fixture('partial-fixture',299),partial=op('partial-refund','refund',100,{charge});
 const part=await performOperation(actor,partial);check(part.status==='succeeded'&&part.amountMinor===100,'partial_refund');check((await performOperation(actor,partial)).providerRef===part.providerRef,'partial_retry');
 const c=await stripe('/charges/'+charge);check(c.amount_refunded===100,'partial_balance');
 stage='invalid_actions';
 await assert.rejects(()=>performOperation(actor,{...partial,amountMinor:101}),e=>e.code==='OPERATION_ID_REUSED');
 await assert.rejects(()=>performOperation(actor,op('over-refund','refund',200,{charge})),e=>e.code==='REFUND_EXCEEDS_BALANCE');
 await assert.rejects(()=>performOperation(actor,op('wrong-currency','refund',1,{charge,currency:'EUR'})),e=>e.code==='PURCHASE_BINDING_INVALID');
 stage='provider_success_database_failure';const rest=op('remainder-refund','refund',199,{charge}),pool=db(),original=pool.query;let injected=false;
 pool.query=function(sql,values,...args){if(!injected&&String(sql).startsWith('UPDATE medicea_billing.console_operation')&&String(sql).includes("state='succeeded'")&&values?.[0]===rest.operationId){injected=true;return Promise.reject(Error('INJECTED_QA_RESULT_WRITE_FAILURE'));}return original.call(this,sql,values,...args);};
 try{await assert.rejects(()=>performOperation(actor,rest));}finally{pool.query=original;}
 check(injected,'failure_injected');const recovered=await performOperation(actor,rest);check(recovered.status==='succeeded'&&recovered.amountMinor===199,'recovery_result');check((await performOperation(actor,rest)).providerRef===recovered.providerRef,'recovery_retry');
 const refunds=await stripe('/refunds',undefined,undefined,form({charge,limit:100}));check(refunds.data.length===2&&refunds.data.reduce((sum,r)=>sum+r.amount,0)===299&&refunds.data.every(r=>r.status==='succeeded'),'exactly_two_refunds');
 console.log('CONSOLE_QA_STAGE partial_and_recovery_passed partial=100 remainder=199 duplicate_refunds=0 over_refund_rejected=true currency_rejected=true');
 stage='full_refund';const fullCharge=await fixture('full-fixture',149),full=op('full-refund','refund',149,{charge:fullCharge}),fullResult=await performOperation(actor,full);
 check(fullResult.status==='succeeded'&&(await performOperation(actor,full)).providerRef===fullResult.providerRef,'full_refund_retry');
 const fullRefunds=await stripe('/refunds',undefined,undefined,form({charge:fullCharge,limit:100}));check(fullRefunds.data.length===1&&fullRefunds.data[0].amount===149,'one_full_refund');
 stage='audit_and_access';const operations=(await db().query('SELECT id,state,provider_ref FROM medicea_billing.console_operation WHERE member_id=$1',[member])).rows;
 check(operations.filter(o=>o.state==='succeeded').length===4&&operations.filter(o=>o.state==='needs_review').length===2,'operation_states');
 const audits=(await db().query('SELECT action,operation_id FROM medicea_billing.console_audit WHERE member_id=$1',[member])).rows;
 check(audits.some(a=>a.action==='operation.needs_review'&&a.operation_id===rest.operationId)&&operations.filter(o=>o.state==='succeeded').every(o=>audits.some(a=>a.operation_id===o.id&&a.action==='operation.provider_result')),'audit_recovery');
 check((await db().query('SELECT member_id FROM medicea_billing.console_entitlement WHERE member_id=$1',[member])).rows.length===0,'no_access_granted');
 console.log('MEDICEA_CONSOLE_QA_RESULT '+JSON.stringify({run,member,customer:customer.id,fixtures,passed:true,realProvider:true,liveMoney:false,paymentRequest:{totalMinor:299,taxMinor:50,currency:'GBP',charged:false,expired:true},partialRefundMinor:100,remainderRefundMinor:199,fullRefundMinor:149,duplicateRefunds:0,databaseFailureRecovered:true,auditVerified:true,entitlementsCreated:0,scope:'actual internal operations + provider + restricted database; HTTP/MFA/browser verified separately'}));
}
main().catch(error=>{console.error('MEDICEA_CONSOLE_QA_FAILED '+JSON.stringify({stage,code:error.code||error.name||'ERROR',run}));process.exitCode=1;}).finally(async()=>{
 // Only this run's synthetic customer and charges can be cleaned up. Never alter an owner/customer purchase.
 try{if(customer){const saved=await stripe('/customers/'+customer.id);check(saved.livemode===false&&saved.metadata?.console_acceptance===run,'cleanup_binding');
  if(sessionId){const s=await stripe('/checkout/sessions/'+sessionId);if(s.status==='open')await stripe('/checkout/sessions/'+sessionId+'/expire',form({}),run+'-expire');}
  for(const id of fixtures){const c=await stripe('/charges/'+id);check(c.customer===customer.id&&c.livemode===false,'cleanup_charge');if(c.amount_refunded<c.amount)await stripe('/refunds',form({charge:id,amount:c.amount-c.amount_refunded,'metadata[console_acceptance]':run}),run+'-cleanup-'+id);}
 }}catch{console.error('MEDICEA_CONSOLE_QA_CLEANUP_REQUIRES_REVIEW');process.exitCode=1;}
 await db().end();
});
