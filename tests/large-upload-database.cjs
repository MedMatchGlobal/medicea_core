const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
const A='00000000-0000-4000-8000-000000000001',B='00000000-0000-4000-8000-000000000002';
const config=JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'fixtures/vault-storage-baseline.json'),'utf8'));
async function database(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
 create table auth.users(id uuid primary key);
 insert into auth.users values('${A}'),('${B}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('aal',current_setting('request.jwt.claim.aal',true))$$;
 create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
 create table storage.buckets(id text primary key,public boolean,file_size_limit bigint);
 insert into storage.buckets values('medicea-vault-beta',false,3145728);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text unique,owner_id text,metadata jsonb);
 create table public.vault_beta_documents(id uuid primary key,user_id uuid references auth.users(id),title text,object_path text unique,mime_type text,size_bytes bigint,
 constraint vault_beta_documents_size_bytes_check check(size_bytes between 1 and 3145728));
 alter table public.vault_beta_documents enable row level security;
 alter table public.vault_beta_documents force row level security;
 alter table storage.objects enable row level security;
 grant usage on schema public,auth,storage to authenticated,anon;
 grant select,insert,update,delete on public.vault_beta_documents,storage.objects to authenticated;`);
 for(const p of config.policies){
  await db.exec(`create policy ${p.policyname} on ${p.schemaname}.${p.tablename} as ${p.permissive} for ${p.cmd} to ${p.roles.join(',')} ${p.qual?'using ('+p.qual+')':''} ${p.with_check?'with check ('+p.with_check+')':''}`);
 }
 await db.exec(fs.readFileSync(require('node:path').join(__dirname,'../supabase/migrations/20261009_large_document_uploads.sql'),'utf8'));
 return db;
}
async function account(db,id=A,aal='aal2'){
 await db.exec(`reset role;select set_config('request.jwt.claim.sub','${id}',false);select set_config('request.jwt.claim.aal','${aal}',false);set role authenticated;`);
}
async function begin(db,size=50000000){return (await db.query(`select public.vault_begin_upload('Fictional',$1,'application/pdf') as result`,[size])).rows[0].result;}
async function object(db,u,size=50000000){await db.query(`insert into storage.objects(bucket_id,name,owner_id,metadata) values('medicea-vault-beta',$1,$2,$3)`,[u.object_path,u.user_id,JSON.stringify({size,mimetype:'application/pdf'})]);}
test('migration executes; MFA, reservations, immutable objects and account isolation enforced by PostgreSQL',async()=>{
 const db=await database();try{
  await account(db,A,'aal1');await assert.rejects(()=>begin(db));
  await account(db);const u=await begin(db);
  await assert.rejects(()=>db.query(`insert into storage.objects values(gen_random_uuid(),'medicea-vault-beta',$1,$2,$3)`,[A+'/unreserved.pdf',A,'{"size":5,"mimetype":"application/pdf"}']));
  await assert.rejects(()=>object(db,u,1));await object(db,u);
  await db.query(`select vault_finish_upload($1)`,[u.id]);
  await db.query(`select vault_finish_upload($1)`,[u.id]); // retry after lost success response
  assert.equal((await db.query('select * from vault_beta_documents')).rows.length,1);
  assert.equal((await db.query('update storage.objects set metadata=metadata returning name')).rows.length,0);
  await account(db,B);assert.equal((await db.query('select * from vault_beta_documents')).rows.length,0);
  assert.equal((await db.query('select * from storage.objects')).rows.length,0);
  await assert.rejects(()=>db.query(`select vault_finish_upload($1)`,[u.id]));
  await account(db,A,'aal1');assert.equal((await db.query('select * from storage.objects')).rows.length,0);
 }finally{await db.close();}
});
test('unfinished, cancelled and expired reservations cannot register; cancellation releases only after cleanup',async()=>{
 const db=await database();try{
  await account(db);const u=await begin(db,5);await assert.rejects(()=>db.query('select vault_finish_upload($1)',[u.id]));
  await object(db,u,5);await db.query('select vault_cancel_upload($1)',[u.id]);
  await assert.rejects(()=>db.query('select vault_finish_upload($1)',[u.id]));
  await db.query('select vault_cancel_upload($1,true)',[u.id]);assert.equal((await db.query('select * from vault_beta_uploads')).rows.length,1);
  await db.query('delete from storage.objects where name=$1',[u.object_path]);await db.query('select vault_cancel_upload($1,true)',[u.id]);
  assert.equal((await db.query('select * from vault_beta_uploads')).rows.length,0);
  const expired=await begin(db,5);await db.exec('reset role');await db.query("update vault_beta_uploads set expires_at=now()-interval '1 second' where id=$1",[expired.id]);await account(db);
  await assert.rejects(()=>object(db,expired,5));await assert.rejects(()=>db.query('select vault_finish_upload($1)',[expired.id]));
 }finally{await db.close();}
});
test('byte boundaries, concurrent reservation ceiling and total quota enforced in SQL',async()=>{
 const db=await database();try{
  await account(db);await assert.rejects(()=>begin(db,50000001));await assert.rejects(()=>begin(db,0));
  for(let i=0;i<3;i++)await begin(db,1);await assert.rejects(()=>begin(db,1));
  await db.exec('reset role;delete from vault_beta_uploads;');await account(db);
  for(let i=0;i<5;i++){const u=await begin(db);await object(db,u);await db.query('select vault_finish_upload($1)',[u.id]);}
  await assert.rejects(()=>begin(db,1));
 }finally{await db.close();}
});
