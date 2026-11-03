const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {PGlite}=require('@electric-sql/pglite');
const moduleFile={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/membership/access-policy.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:moduleFile,exports:moduleFile.exports,Date,URL});const {parseAccessPolicy,operationModule}=moduleFile.exports;
const member='22222222-2222-4222-8222-222222222222',actor='11111111-1111-4111-8111-111111111111';
test('policies reject invalid caps, duplicate modules, forged modules and expired dates',()=>{
 const p={module:'medicine',monthlyLimit:25,expiresAt:null};
 assert.equal(parseAccessPolicy({mode:'full'}).mode,'full');assert.equal(parseAccessPolicy({mode:'custom',permissions:[p]}).permissions[0].monthlyLimit,25);
 for(const permissions of [[],[p,p],[{...p,module:'all'}],[{...p,monthlyLimit:0}],[{...p,monthlyLimit:1.5}],[{...p,expiresAt:'2020-01-01'}],[{...p,monthlyLimit:'unlimited'}],[{...p,expiresAt:'invalid'}]])assert.equal(parseAccessPolicy({mode:'custom',permissions}),null);
});
test('server operation chooses module regardless of forged client module field',async()=>{
 for(const [path,expected] of [['/api/ai-search','health'],['/api/triage','health'],['/api/openai/pets','medicine'],['/api/openai/generics','medicine'],['/api/openai/veterinary-information','medicine']])assert.equal(await operationModule(new Request('https://preview.test'+path,{method:'POST',body:JSON.stringify({module:'medicine'})})),expected);
 assert.equal(await operationModule(new Request('https://preview.test/api/membership/search',{method:'POST',body:JSON.stringify({mode:'pet-generic',module:'health'})})),'medicine');
});
test('database enforces per-module quotas, expiry, revocation, paid priority and legacy full grants',async()=>{
 const db=new PGlite();try{
 for(const file of ['001_membership.sql','002_trial_and_passes.sql','004_complimentary.sql','005_module_access.sql'])await db.exec(fs.readFileSync('billing/migrations/'+file,'utf8'));
 await db.query("insert into medicea_billing.complimentary_access(email,note,updated_by,full_access) values('friend@example.test','Custom',$1,false),('full@example.test','Legacy',$1,true)",[actor]);
 await db.exec("insert into medicea_billing.complimentary_permission values('friend@example.test','medicine',2,null),('friend@example.test','health',null,now()+interval '7 days')");
 let id=0;const reserve=async(module,email='friend@example.test')=>(await db.query('select medicea_billing.reserve_search($1,$2,$3,$4) r',[member,`33333333-3333-4333-8333-${String(++id).padStart(12,'0')}`,email,module])).rows[0].r;
 const status=async()=>(await db.query('select medicea_billing.member_status($1,$2,$3) r',[member,'friend@example.test','medicine'])).rows[0].r;
 const finish=async(r,success=true)=>db.query('select medicea_billing.finish_search($1,$2,$3)',[member,r.id,success]);
 let r=await reserve('medicine');assert.equal(r.source,'complimentary');await finish(r,false);assert.equal((await status()).moduleRemaining,2);
 for(let i=0;i<2;i++){r=await reserve('medicine');assert.equal(r.allowed,true);await finish(r);}
 assert.equal((await reserve('medicine')).reason,'MONTHLY_LIMIT');assert.equal((await status()).moduleRemaining,0);assert.equal((await status()).premium,false);
 r=await reserve('pets');assert.equal(r.source,'trial');await finish(r);
 for(let i=0;i<6;i++){r=await reserve('health');assert.equal(r.source,'complimentary');await finish(r);}
 // Editing cap keeps this month's successful usage; prior UTC months do not count.
 await db.exec("update medicea_billing.complimentary_permission set monthly_limit=3 where module='medicine'");assert.equal((await status()).moduleRemaining,1);
 await db.exec("update medicea_billing.search set period='2020-01' where module='medicine'");assert.equal((await status()).moduleRemaining,3);
 const pending=[];for(let i=0;i<3;i++)pending.push(await reserve('medicine'));assert.equal((await reserve('health')).reason,'TOO_MANY_CONCURRENT_REQUESTS');for(const p of pending)await finish(p,false);
 await db.exec("update medicea_billing.complimentary_permission set expires_at=now()-interval '1 second' where module='health'");r=await reserve('health');assert.equal(r.source,'trial');await finish(r);
 await db.exec("update medicea_billing.complimentary_access set active=false where email='friend@example.test'");assert.equal((await status()).moduleGranted,false);r=await reserve('medicine');assert.equal(r.source,'trial');await finish(r);
 r=await reserve('pets','full@example.test');assert.equal(r.source,'complimentary');await finish(r);
 await db.query("insert into medicea_billing.entitlement(provider,external_id,member_id,active,valid_until) values('stripe','sub_test',$1,true,now()+interval '30 days')",[member]);r=await reserve('medicine');assert.equal(r.source,'paid');await finish(r);
 assert.equal((await reserve('forged')).reason,'INVALID_MODULE');
 }finally{await db.close();}
});

test('owner policy updates are atomic, preserve usage, and revocation retains an audit record',async()=>{
 const db=new PGlite();try{
 for(const file of ['001_membership.sql','002_trial_and_passes.sql','004_complimentary.sql','005_module_access.sql'])await db.exec(fs.readFileSync('billing/migrations/'+file,'utf8'));
 const query=async(strings,...values)=>{let sql=strings[0];values.forEach((v,i)=>sql+='$'+(i+1)+strings[i+1]);return (await db.query(sql,values)).rows;};
 const tx={$queryRaw:query,$executeRaw:query};const client={...tx,$transaction:async fn=>{await db.exec('BEGIN');try{const result=await fn(tx);await db.exec('COMMIT');return result;}catch(e){await db.exec('ROLLBACK');throw e;}}};
 const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/membership/complimentary.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:m,exports:m.exports,require:n=>{if(n==='./store')return {billingDb:()=>client};throw Error(n);},process:{env:{}}});
 const {changeComplimentary,listComplimentary}=m.exports;
 await changeComplimentary(actor,'friend@example.test','Friend',true,{mode:'custom',permissions:[{module:'medicine',monthlyLimit:25,expiresAt:null}]});
 let rows=await listComplimentary();assert.equal(rows[0].full_access,false);assert.equal(rows[0].permissions[0].monthlyLimit,25);
 await assert.rejects(changeComplimentary(actor,'friend@example.test','Bad',true,{mode:'custom',permissions:[{module:'forged',monthlyLimit:25,expiresAt:null}]}));rows=await listComplimentary();assert.equal(rows[0].note,'Friend');assert.equal(rows[0].permissions[0].module,'medicine');
 await changeComplimentary(actor,'friend@example.test','Friend',false);assert.equal((await listComplimentary()).length,0);
 assert.equal((await db.query('select count(*)::int n from medicea_billing.complimentary_audit')).rows[0].n,2);
 }finally{await db.close();}
});

test('three admin groups share human/pet AI quota while portal is duration-only and cannot grant AI searches',async()=>{
 const db=new PGlite();try{
 for(const file of ['001_membership.sql','002_trial_and_passes.sql','004_complimentary.sql','005_module_access.sql'])await db.exec(fs.readFileSync('billing/migrations/'+file,'utf8'));
 await db.query("insert into medicea_billing.complimentary_access(email,note,updated_by,full_access) values('friend@example.test','Custom',$1,false),('full@example.test','Full',$1,true)",[actor]);
 await db.exec("insert into medicea_billing.complimentary_permission values('friend@example.test','pets',1,null)");
 await db.exec(fs.readFileSync('billing/migrations/006_admin_modules.sql','utf8'));
 const st=async(email='friend@example.test')=>(await db.query('select medicea_billing.member_status($1,$2) r',[member,email])).rows[0].r;
 assert.equal((await st()).moduleAccess[0].module,'medicine');assert.equal((await st()).portalAccess,false);assert.equal((await st('full@example.test')).portalAccess,true);
 let id=1000;const reserve=async(module)=>(await db.query('select medicea_billing.reserve_search($1,$2,$3,$4) r',[member,`33333333-3333-4333-8333-${String(++id).padStart(12,'0')}`,'friend@example.test',module])).rows[0].r;
 let r=await reserve('pets');assert.equal(r.source,'complimentary');await db.query('select medicea_billing.finish_search($1,$2,true)',[member,r.id]);assert.equal((await reserve('medicine')).reason,'MONTHLY_LIMIT');
 await db.exec("insert into medicea_billing.complimentary_permission values('friend@example.test','portal',null,now()+interval '1 day')");assert.equal((await st()).portalAccess,true);assert.equal((await st()).premium,false);assert.equal((await reserve('portal')).reason,'INVALID_MODULE');assert.equal((await reserve('medicine')).reason,'MONTHLY_LIMIT');
 await assert.rejects(db.exec("update medicea_billing.complimentary_permission set monthly_limit=25 where module='portal'"));
 await db.exec("update medicea_billing.complimentary_permission set expires_at=now()-interval '1 second' where module='portal'");assert.equal((await st()).portalAccess,false);
 await db.exec("update medicea_billing.complimentary_permission set expires_at=null where module='portal';update medicea_billing.complimentary_access set active=false where email='friend@example.test'");assert.equal((await st()).portalAccess,false);
 const policy={mode:'custom',permissions:[{module:'portal',monthlyLimit:null,expiresAt:null}]};assert.equal(parseAccessPolicy(policy).permissions[0].module,'portal');assert.equal(parseAccessPolicy({...policy,permissions:[{module:'portal',monthlyLimit:25,expiresAt:null}]}),null);
 }finally{await db.close();}
});
test('module consolidation refuses conflicting saved rules rather than silently changing them',async()=>{
 const db=new PGlite();try{
 for(const file of ['001_membership.sql','002_trial_and_passes.sql','004_complimentary.sql','005_module_access.sql'])await db.exec(fs.readFileSync('billing/migrations/'+file,'utf8'));
 await db.query("insert into medicea_billing.complimentary_access(email,note,updated_by,full_access) values('friend@example.test','Custom',$1,false)",[actor]);await db.exec("insert into medicea_billing.complimentary_permission values('friend@example.test','medicine',25,null),('friend@example.test','pets',50,null)");
 await assert.rejects(db.exec(fs.readFileSync('billing/migrations/006_admin_modules.sql','utf8')),/CONFLICTING_MEDICINE_POLICIES/);await db.exec('ROLLBACK');assert.equal((await db.query('select count(*)::int n from medicea_billing.complimentary_permission')).rows[0].n,2);
 }finally{await db.close();}
});
