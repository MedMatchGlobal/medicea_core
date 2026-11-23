const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const {PGlite}=require('@electric-sql/pglite');
function load(file,imports={},env={}){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{module,exports:module.exports,require:name=>imports[name],process:{env},Response,Request,URL,Date,Intl});return module.exports;}
const business=load('lib/membership/business.ts'),config=load('lib/membership/config.ts'),text=load('lib/membership/confirmation-text.ts',{'./business':business,'./config':config});
const A='11111111-1111-4111-8111-111111111111';
const sample={version:'2026-11-23',kind:'scheduled_upgrade',reference:'cs_test_qa',plan:'monthly',currency:'GBP',amountMinor:299,renewalAmountMinor:299,taxMinor:null,startsAt:'2026-11-30T07:36:14Z',issuedAt:'2026-11-23T21:00:00Z'};
test('retained confirmation captures seller, exact commercial terms, refund policy, support and future charge without claiming payment',()=>{
 const result=text.confirmationText(sample);for(const expected of ['G.E.S. Consultancy Limited','07467951','GB104912052','billing@medicea.global','support@medicea.global','Charge now: £0.00','£2.99','14 days','scheduled upgrade','Renews every month','not a VAT invoice','GMT (London time)'])assert.ok(result.includes(expected),expected);
 assert.match(text.confirmationText({...sample,startsAt:'2027-06-30T07:36:14Z'}),/BST \(London time\)/);
 for(const changed of [{amountMinor:1.2},{currency:'XYZ'},{reference:'foreign'},{taxMinor:300},{startsAt:'bad'},{renewalAmountMinor:undefined}])assert.throws(()=>text.confirmationText({...sample,...changed}));
});
test('duplicate provider delivery creates one immutable confirmation; browser roles cannot read it',async()=>{
 const db=new PGlite();try{await db.exec('CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA medicea_billing;');await db.exec(fs.readFileSync('billing/migrations/20261123212511_purchase_confirmation_outbox.sql','utf8'));
 for(let n=0;n<2;n++)await db.query("INSERT INTO medicea_billing.purchase_confirmation(provider_key,member_id,recipient,snapshot,body) VALUES('stripe:qa',$1,'qa@example.test','{}','original terms') ON CONFLICT(provider_key) DO NOTHING",[A]);assert.equal((await db.query('SELECT count(*) FROM medicea_billing.purchase_confirmation')).rows[0].count,1);
 await assert.rejects(()=>db.query("UPDATE medicea_billing.purchase_confirmation SET body='replacement terms'"));await db.query("UPDATE medicea_billing.purchase_confirmation SET state='sent',accepted_at=now()");
 for(const role of ['anon','authenticated']){await db.exec('SET ROLE '+role);await assert.rejects(()=>db.query('SELECT * FROM medicea_billing.purchase_confirmation'));await db.exec('RESET ROLE');}
 }finally{await db.close();}
});
test('mail connection requires Preview opt-in, uses verified TLS and never enables file or URL access',()=>{
 let options;const mail=load('lib/membership/confirmation-mail.ts',{'./config':{membershipPreviewEnabled:()=>true},nodemailer:{createTransport:o=>{options=o;return {verify:async()=>true};}}},{MEDICEA_CONFIRMATIONS_PREVIEW:'true',MEDICEA_BILLING_SMTP_PASSWORD:'fixture-only-not-a-credential'});mail.confirmationMailTransport();assert.equal(options.host,'mail.privateemail.com');assert.equal(options.auth.user,'billing@medicea.global');assert.equal(options.secure,true);assert.equal(options.tls.rejectUnauthorized,true);assert.equal(options.disableFileAccess,true);assert.equal(options.disableUrlAccess,true);assert.equal(options.logger,false);
 const disabled=load('lib/membership/confirmation-mail.ts',{'./config':{membershipPreviewEnabled:()=>false}},{MEDICEA_CONFIRMATIONS_PREVIEW:'true'});assert.throws(()=>disabled.confirmationMailTransport());
});
test('unknown SMTP outcome is held for review; connection failures leave queue unclaimed; accepted messages use stable IDs',async()=>{
 let verified=true,claimed=0,updates=[],sends=[],queue=[{id:A,recipient:'qa@example.test',body:'Retain these terms'}],fail=true;
 const transport={verify:async()=>{if(!verified)throw Error('AUTH_FAILED');},sendMail:async message=>{sends.push(message);if(fail)throw Error('DATA_TIMEOUT');return {accepted:['qa@example.test']};},close:()=>{}};
 const database={$executeRaw:async(parts,...values)=>{updates.push({sql:parts.join('?'),values});return 1;},$queryRaw:async()=>{claimed++;return queue.splice(0,1);}};
 const module=load('lib/membership/confirmations.ts',{'./store':{billingDb:()=>database},'./config':{membershipPreviewEnabled:()=>true},'./stripe':{},'./confirmation-text':text,'./confirmation-mail':{confirmationMailTransport:()=>transport}},{MEDICEA_CONFIRMATIONS_PREVIEW:'true'});
 verified=false;await assert.rejects(()=>module.deliverConfirmations());assert.equal(claimed,0);verified=true;await module.deliverConfirmations();assert.ok(updates.some(u=>u.sql.includes('SMTP_OUTCOME_REQUIRES_REVIEW')));assert.equal(sends.length,1);assert.equal(sends[0].messageId,`<medicea-confirmation-${A}@medicea.global>`);assert.equal(sends[0].attachments[0].content,'Retain these terms');
 queue=[{id:A,recipient:'qa@example.test',body:'Retain these terms'}];fail=false;await module.deliverConfirmations();assert.ok(updates.some(u=>u.sql.includes("state='sent'")));
});
test('confirmation download requires authentication and binds its SQL query to the signed-in account',async()=>{
 let user=null,queries=[];const route=load('app/api/membership/confirmations/route.ts',{'@/lib/membership/config':{membershipPreviewEnabled:()=>true},'@/lib/membership/auth':{membershipUser:async()=>user},'@/lib/membership/store':{billingDb:()=>({$queryRaw:async(parts,...values)=>{queries.push({sql:parts.join('?'),values});return [];}})}});
 assert.equal((await route.GET(new Request('https://preview.test/api/membership/confirmations?id='+A))).status,401);assert.equal(queries.length,0);user={id:A};assert.equal((await route.GET(new Request('https://preview.test/api/membership/confirmations?id='+A))).status,404);assert.equal(queries[0].values[1],A);assert.ok(queries[0].sql.includes('member_id='));
});
test('verified pass, renewal and scheduled-upgrade events capture actual amounts; old and console events do not send confirmations',async()=>{
 let inserts=[],allowOwner=true,calls=0,mode='pass';
 const pass={id:'cs_test_pass',livemode:false,status:'complete',mode:'payment',payment_status:'paid',client_reference_id:A,customer:'cus_qa',metadata:{member_id:A,plan:'pass7'},currency:'gbp',amount_total:149,total_details:{amount_tax:25}};
 const invoice={id:'in_qa',livemode:false,status:'paid',customer:'cus_qa',currency:'gbp',total:299,total_taxes:[{amount:50}],billing_reason:'subscription_cycle',parent:{subscription_details:{subscription:'sub_qa'}},lines:{data:[{price:{id:'price_monthly'},period:{start:1795468500,end:1798060500}}],has_more:false}};
 const setup={...pass,id:'cs_test_setup',mode:'setup',metadata:{member_id:A,plan:'monthly',currency:'GBP',reservation_policy:'medicea-next-access-v1',reservation_processed:'true',reservation_start:'1796024174'}};
 const database={$queryRaw:async(parts)=>parts.join('').includes('valid_until')?[{valid_until:'2026-11-30T07:36:14Z'}]:allowOwner?[{email:'qa@example.test'}]:[],$executeRaw:async(parts,...values)=>{inserts.push(values);return 1;}};
 const api=load('lib/membership/confirmations.ts',{'./store':{billingDb:()=>database},'./config':{...config,membershipPreviewEnabled:()=>true},'./stripe':{planPriceId:plan=>'price_'+plan,stripeRequest:async path=>{calls++;if(path==='/invoices/in_qa')return invoice;if(path==='/subscriptions/sub_qa')return {livemode:false,customer:'cus_qa',metadata:{member_id:A}};if(path==='/prices/price_monthly')return {livemode:false,currency:'gbp',unit_amount:299,recurring:{interval:'month'}};return mode==='setup'?setup:pass;}},'./confirmation-text':text,'./confirmation-mail':{}},{MEDICEA_CONFIRMATIONS_PREVIEW:'true',MEDICEA_CONFIRMATIONS_FROM_EPOCH:'1795468000'});
 const event={livemode:false,created:1795468500,type:'checkout.session.completed',data:{object:{id:'cs_test_pass'}}};
 await api.queueStripeConfirmation({...event,created:1795467000});await api.queueStripeConfirmation({...event,data:{object:{metadata:{console_policy:'customer-approved-payment-request-v1'}}}});assert.equal(calls,0);
 await api.queueStripeConfirmation(event);assert.equal(JSON.parse(inserts[0][3]).amountMinor,149);assert.equal(JSON.parse(inserts[0][3]).taxMinor,25);
 await api.queueStripeConfirmation({...event,type:'invoice.paid',data:{object:{id:'in_qa'}}});assert.equal(JSON.parse(inserts[1][3]).kind,'renewal');assert.equal(JSON.parse(inserts[1][3]).renewalAmountMinor,299);
 mode='setup';await api.queueStripeConfirmation({...event,data:{object:{id:'cs_test_setup'}}});assert.equal(JSON.parse(inserts[2][3]).kind,'scheduled_upgrade');assert.match(inserts[2][4],/Charge now: £0.00/);
 allowOwner=false;await assert.rejects(()=>api.queueStripeConfirmation(event));assert.equal(inserts.length,3);
});
