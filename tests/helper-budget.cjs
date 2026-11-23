const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
const migration=fs.readFileSync('billing/migrations/20261123211752_supporting_translation_budget.sql','utf8');
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
async function setup(){const db=new PGlite();await db.exec('CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA medicea_billing;');await db.exec(migration);return db;}
async function consume(db,member=A,chars=20){return (await db.query('SELECT medicea_billing.consume_helper_budget($1,$2) result',[member,chars])).rows[0].result;}
test('shared supporting-tool counters prevent concurrent overspend across requests and isolate accounts',async()=>{
 const db=await setup();try{const replies=await Promise.all(Array.from({length:15},()=>consume(db)));assert.equal(replies.filter(r=>r.allowed).length,12);assert.ok(replies.filter(r=>!r.allowed).every(r=>r.retryAfter>0&&r.retryAfter<=60));assert.equal((await consume(db,B)).allowed,true);
 assert.equal((await db.query('SELECT minute_calls FROM medicea_billing.helper_budget WHERE member_id=$1',[A])).rows[0].minute_calls,12);
 }finally{await db.close();}
});
test('character budgets, hourly/daily caps and UTC resets are enforced without storing translation text',async()=>{
 const db=await setup();try{assert.equal((await consume(db,A,64000)).allowed,true);assert.equal((await consume(db,A,64000)).allowed,true);assert.equal((await consume(db,A,1)).allowed,false);
 await db.exec("UPDATE medicea_billing.helper_budget SET hour_at=hour_at-interval '1 hour',minute_at=minute_at-interval '1 minute'");assert.equal((await consume(db,A,1)).allowed,true);
 await db.exec('UPDATE medicea_billing.helper_budget SET day_calls=600');assert.equal((await consume(db,A,1)).allowed,false);
 await db.exec("UPDATE medicea_billing.helper_budget SET day_at=day_at-interval '1 day',hour_at=hour_at-interval '1 hour',minute_at=minute_at-interval '1 minute'");assert.equal((await consume(db,A,1)).allowed,true);
 for(const chars of [0,64001,-1])await assert.rejects(()=>consume(db,A,chars));
 const columns=(await db.query("SELECT column_name FROM information_schema.columns WHERE table_schema='medicea_billing' AND table_name='helper_budget'")).rows.map(r=>r.column_name);assert.deepEqual(columns.sort(),['member_id','minute_at','hour_at','day_at','minute_calls','hour_calls','day_calls','hour_chars','day_chars'].sort());
 }finally{await db.close();}
});
test('anonymous and signed-in browser roles cannot inspect or spend another account helper budget',async()=>{
 const db=await setup();try{for(const role of ['anon','authenticated']){await db.exec('SET ROLE '+role);await assert.rejects(()=>consume(db));await assert.rejects(()=>db.query('SELECT * FROM medicea_billing.helper_budget'));await db.exec('RESET ROLE');}}finally{await db.close();}
});
