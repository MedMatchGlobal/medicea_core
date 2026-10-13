const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
let seq=0;const id=()=>`33333333-3333-4333-8333-${String(++seq).padStart(12,'0')}`;
async function setup(){const db=new PGlite();await db.exec(fs.readFileSync('billing/migrations/001_membership.sql','utf8'));return db;}
async function reserve(db,user=A,key=id()){return (await db.query('select medicea_billing.reserve_search($1,$2) result',[user,key])).rows[0].result;}
async function finish(db,key,success,user=A){await db.query('select medicea_billing.finish_search($1,$2,$3)',[user,key,success]);}
async function status(db,user=A){return (await db.query('select medicea_billing.member_status($1) result',[user])).rows[0].result;}
test('two successful searches share one account month; failures release quota; replay and other-account finalisation fail',async()=>{const db=await setup();try{const failed=await reserve(db);await finish(db,failed.id,false);assert.equal((await status(db)).used,0);const one=await reserve(db);await assert.rejects(()=>finish(db,one.id,true,B));await finish(db,one.id,true);await assert.rejects(()=>finish(db,one.id,true));assert.equal((await reserve(db,A,one.id)).allowed,false);const two=await reserve(db);await finish(db,two.id,true);assert.equal((await reserve(db)).reason,'MONTHLY_LIMIT');assert.equal((await status(db)).used,2);assert.equal((await status(db,B)).used,0);assert.equal((await reserve(db,B)).allowed,true);}finally{await db.close();}});
test('reservations prevent overspending, expired reservations release slots and past months do not count',async()=>{const db=await setup();try{const results=await Promise.all([reserve(db),reserve(db),reserve(db)]);assert.equal(results.filter(r=>r.allowed).length,2);await db.exec("update medicea_billing.search set expires_at=now()-interval '1 second'");assert.equal((await reserve(db)).allowed,true);await db.exec("update medicea_billing.search set state='succeeded',period='2000-01'");assert.equal((await status(db)).used,0);}finally{await db.close();}});
test('personal paid access has no monthly cap but expiry and cancellation remove access',async()=>{const db=await setup();try{await db.query("insert into medicea_billing.entitlement(provider,external_id,member_id,active,valid_until) values('stripe','sub_test',$1,true,now()+interval '1 day')",[A]);for(let n=0;n<5;n++){const r=await reserve(db);assert.equal(r.allowed,true);await finish(db,r.id,true);}assert.equal((await status(db)).premium,true);await db.exec("update medicea_billing.entitlement set active=false");assert.equal((await reserve(db)).allowed,false);await db.exec("update medicea_billing.entitlement set active=true,valid_until=now()-interval '1 second'");assert.equal((await status(db)).premium,false);}finally{await db.close();}});

async function launchDb(){const db=await setup();await db.exec(fs.readFileSync('billing/migrations/002_trial_and_passes.sql','utf8'));return db;}
test('trial grants only five successes in total, starts on first success, cannot reset next month or on another session',async()=>{
 const db=await launchDb();try{
  const failed=await reserve(db);assert.equal(failed.source,'trial');await finish(db,failed.id,false);assert.equal((await status(db)).trialEndsAt,null);
  for(let i=0;i<5;i++){const trial=await reserve(db);assert.equal(trial.source,'trial');await finish(db,trial.id,true);}
  const s=await status(db);assert.equal(s.trialUsed,5);assert.equal(s.used,0);assert.ok(s.trialEndsAt);
  const firstFree=await reserve(db);assert.equal(firstFree.source,'free');await finish(db,firstFree.id,true);const secondFree=await reserve(db);await finish(db,secondFree.id,true);assert.equal((await reserve(db)).allowed,false);
  await db.exec("update medicea_billing.search set period='2000-01'");assert.equal((await status(db)).trialUsed,5);assert.equal((await reserve(db)).source,'free');
 }finally{await db.close();}
});
test('expired trial returns to free allowance and pending requests cannot exceed five trial slots',async()=>{
 const db=await launchDb();try{
  for(let i=0;i<4;i++){const q=await reserve(db);await finish(db,q.id,true);}
  const fifth=await reserve(db);assert.equal(fifth.source,'trial');assert.equal((await reserve(db)).reason,'TRIAL_REQUESTS_PENDING');await finish(db,fifth.id,false);
  const retry=await reserve(db);assert.equal(retry.source,'trial');await finish(db,retry.id,true);
  await db.exec("update medicea_billing.trial set started_at=now()-interval '8 days'");assert.equal((await status(db)).trialAvailable,false);assert.equal((await reserve(db)).source,'free');
  assert.equal((await status(db,B)).trialUsed,0);
 }finally{await db.close();}
});
test('fixed-duration passes expire without consuming monthly free or trial quota',async()=>{
 const db=await launchDb();try{
  await db.query("insert into medicea_billing.entitlement(provider,external_id,member_id,active,valid_until) values('stripe','cs_test_pass',$1,true,now()+interval '7 days')",[A]);
  for(let i=0;i<8;i++){const q=await reserve(db);assert.equal(q.source,'paid');await finish(db,q.id,true);}
  assert.equal((await status(db)).used,0);assert.equal((await status(db)).trialUsed,0);
  await db.exec("update medicea_billing.entitlement set valid_until=now()-interval '1 second'; update medicea_billing.trial set started_at=now()-interval '8 days'");
  assert.equal((await status(db)).premium,false);assert.equal((await reserve(db)).source,'free');
 }finally{await db.close();}
});
