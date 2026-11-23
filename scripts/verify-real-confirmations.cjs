/* Read-only Stripe + rollback-only confirmation acceptance. No mail, purchases or account changes. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module'),{createHash}=require('node:crypto'),ts=require('typescript');
if(process.argv[2]!=='--rollback-only'||process.env.VERCEL_ENV!=='preview'||process.env.VERCEL_PROJECT_ID!=='prj_zIesaaTzLOzNm32TYoEfcv7DQklE')throw Error('EXPLICIT_PRIVATE_ROLLBACK_TEST_REQUIRED');
const root=path.resolve(__dirname,'..'),cache=new Map();
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);const native=createRequire(file),local=name=>name.startsWith('.')?load(path.resolve(path.dirname(file),name)+'.ts'):native(name);vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{module,exports:module.exports,require:local,process,fetch,URL,URLSearchParams,Date,Intl,Buffer,Response,AbortSignal,setTimeout,clearTimeout});return module.exports;}
const store=load(path.join(root,'lib/membership/store.ts')),actualDb=store.billingDb(),stripe=load(path.join(root,'lib/membership/stripe.ts')),originalStripe=stripe.stripeRequest;
const config=load(path.join(root,'lib/membership/config.ts'));
const member='7636baf1-b0f5-4713-ae1a-60ffc4ea0e7b';
let stage='preflight',stripeReads=0,attemptedMail=0,activeTx=null;
function check(value,code){if(!value)throw Object.assign(Error(code),{acceptanceCode:code});}
stripe.stripeRequest=async function(resource,params,...rest){check(params===undefined,'STRIPE_MUTATION_FORBIDDEN');stripeReads++;return originalStripe(resource,params,...rest);};
store.billingDb=()=>activeTx||actualDb;
const mail=load(path.join(root,'lib/membership/confirmation-mail.ts'));mail.confirmationMailTransport=()=>{attemptedMail++;throw Error('MAIL_FORBIDDEN_IN_ROLLBACK_TEST');};
const confirmation=load(path.join(root,'lib/membership/confirmations.ts'));
const rollback=Error('EXPECTED_ROLLBACK_ONLY');
(async()=>{
 const binding=await actualDb.$queryRaw`SELECT customer_id FROM medicea_billing.stripe_customer WHERE member_id=${member}::uuid`;
 check(binding.length===1,'ONE_BOUND_CUSTOMER_REQUIRED');
 const customer=await stripe.stripeRequest('/customers/'+binding[0].customer_id);
 check(customer.livemode===false&&customer.metadata?.member_id===member,'SANDBOX_CUSTOMER_BINDING_REQUIRED');
 const passes=await actualDb.$queryRaw`SELECT external_id,valid_until FROM medicea_billing.entitlement WHERE provider='stripe' AND member_id=${member}::uuid AND customer_id=${customer.id} AND external_id LIKE 'cs_test_%' ORDER BY valid_until DESC LIMIT 1`;
 check(passes.length===1,'EXISTING_PASS_REQUIRED');
 const upgrade=JSON.parse(customer.metadata?.medicea_next_access||'null');check(upgrade&&/^cs_test_[A-Za-z0-9]+$/.test(upgrade.session),'EXISTING_UPGRADE_REQUIRED');
 const ids=[passes[0].external_id,upgrade.session],selected=[];
 let cursor;
 for(let page=0;page<10&&selected.length<2;page++){
  const query=new URLSearchParams({type:'checkout.session.completed',limit:'100'});if(cursor)query.set('starting_after',cursor);
  const events=await stripe.stripeRequest('/events',undefined,undefined,15000,undefined,query);
  for(const event of events.data||[])if(ids.includes(event.data?.object?.id)&&!selected.some(e=>e.data.object.id===event.data.object.id))selected.push(event);
  if(!events.has_more)break;cursor=events.data?.at(-1)?.id;check(cursor,'EVENT_CURSOR_REQUIRED');
 }
 check(selected.length===2&&selected.every(e=>e.livemode===false),'BOTH_REAL_STRIPE_EVENTS_REQUIRED');
 process.env.MEDICEA_CONFIRMATIONS_PREVIEW='true';process.env.MEDICEA_CONFIRMATIONS_FROM_EPOCH='1795392000';
 check(selected.every(e=>e.created>=1795392000),'SOURCE_EVENT_BEFORE_CONFIRMATION_CUTOVER');
 const keys=selected.map(e=>'stripe:'+(e.data.object.mode==='setup'?'scheduled_upgrade':'purchase')+':'+e.data.object.id),results=[];
 const before=await actualDb.$queryRaw`SELECT count(*)::int AS count FROM medicea_billing.purchase_confirmation WHERE provider_key IN (${keys[0]},${keys[1]})`;
 check(before[0].count===0,'EXISTING_DOCUMENT_MUST_REMAIN_UNTOUCHED');
 stage='real_event_to_snapshot';
 try{
  await actualDb.$transaction(async tx=>{
   activeTx={
    $queryRaw:(parts,...values)=>{check(/^SELECT\s/.test(parts.join('')),'READ_ONLY_QUERY_REQUIRED');return tx.$queryRaw(parts,...values);},
    $executeRaw:(parts,...values)=>{check(/^INSERT INTO medicea_billing\.purchase_confirmation\(/.test(parts.join('')),'ONLY_TEMPORARY_CONFIRMATION_INSERT_ALLOWED');return tx.$executeRaw(parts,...values);}
   };
   for(const event of selected){
    const key='stripe:'+(event.data.object.mode==='setup'?'scheduled_upgrade':'purchase')+':'+event.data.object.id;
    await confirmation.queueStripeConfirmation(event);
    const first=await tx.$queryRaw`SELECT id::text,body,snapshot,recipient,state FROM medicea_billing.purchase_confirmation WHERE provider_key=${key}`;
    check(first.length===1&&first[0].state==='pending','ONE_PENDING_DOCUMENT_REQUIRED');
    await confirmation.queueStripeConfirmation(event);
    const replay=await tx.$queryRaw`SELECT id::text,body,snapshot,recipient FROM medicea_billing.purchase_confirmation WHERE provider_key=${key}`;
    check(replay.length===1&&replay[0].id===first[0].id&&replay[0].body===first[0].body,'DUPLICATE_EVENT_MUST_NOT_REPLACE_DOCUMENT');
    const source=await stripe.stripeRequest('/checkout/sessions/'+event.data.object.id),snapshot=first[0].snapshot;
    check(first[0].recipient==='sergio@medicea.global','VERIFIED_ACCOUNT_RECIPIENT_REQUIRED');
    check(first[0].body.includes('GMT (London time)')&&first[0].body.includes('14 days')&&first[0].body.includes('support@medicea.global'),'RETAINABLE_TERMS_AND_LONDON_TIME_REQUIRED');
    if(source.mode==='setup'){
     const scheduled=await stripe.stripeRequest((upgrade.kind==='schedule'?'/subscription_schedules/':'/invoices/')+upgrade.id);
     const savedPrice=upgrade.kind==='schedule'?scheduled.phases?.[0]?.items?.[0]?.price:scheduled.lines?.data?.[0]?.pricing?.price_details?.price||scheduled.lines?.data?.[0]?.price?.id;
     const price=await stripe.stripeRequest('/prices/'+(typeof savedPrice==='string'?savedPrice:savedPrice?.id));
     const zero=new Intl.NumberFormat('en-GB',{style:'currency',currency:source.metadata.currency}).format(0);
     check(price.livemode===false&&snapshot.kind==='scheduled_upgrade'&&snapshot.plan===source.metadata.plan&&snapshot.currency===source.metadata.currency&&snapshot.currency===price.currency.toUpperCase()&&snapshot.amountMinor===price.unit_amount&&first[0].body.includes('Charge now: '+zero),'SCHEDULED_UPGRADE_TERMS_MISMATCH');
     check(snapshot.startsAt===new Date(Number(source.metadata.reservation_start)*1000).toISOString(),'ACTUAL_UPGRADE_DATE_MISMATCH');
    }else{
     check(snapshot.kind==='purchase'&&snapshot.plan===source.metadata.plan&&snapshot.amountMinor===source.amount_total&&snapshot.currency===source.currency.toUpperCase(),'ACTUAL_PASS_PRICE_MISMATCH');
     check(snapshot.endsAt===new Date(passes[0].valid_until).toISOString(),'IMMUTABLE_PASS_EXPIRY_MISMATCH');
    }
    results.push({kind:snapshot.kind,plan:snapshot.plan,amountMinor:snapshot.amountMinor,currency:snapshot.currency,duplicateDocumentCount:1,bodyHash:createHash('sha256').update(first[0].body).digest('hex')});
   }
   throw rollback; // Required rollback: no confirmation or account write survives.
  },{timeout:90000,maxWait:10000});
 }catch(error){if(error!==rollback)throw error;}finally{activeTx=null;}
 stage='rollback_verification';
 const after=await actualDb.$queryRaw`SELECT count(*)::int AS count FROM medicea_billing.purchase_confirmation WHERE provider_key IN (${keys[0]},${keys[1]})`;
 check(after[0].count===0&&attemptedMail===0,'ROLLBACK_AND_NO_MAIL_REQUIRED');
 console.log('MEDICEA_REAL_CONFIRMATION_ACCEPTANCE '+JSON.stringify({passed:true,source:'two genuine sandbox checkout.session.completed events; latest bound provider state and hosted SQL',results,stripeReads,stripeWrites:0,emailsSent:0,persistentDocumentsCreated:0,accountChanges:0,scope:'real provider event -> actual confirmation code -> hosted SQL snapshot -> duplicate replay -> mandatory rollback; HTTP signature and SMTP delivery verified separately'}));
})().catch(error=>{console.error('MEDICEA_REAL_CONFIRMATION_FAILED '+JSON.stringify({stage,code:error.acceptanceCode||error.code||'VALIDATION_OR_PROVIDER_ERROR'}));process.exitCode=1;}).finally(async()=>{await actualDb.$disconnect();});
