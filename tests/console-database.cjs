const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
test('console role has bounded account reads and append-only audit without auth secrets or access mutation',async()=>{
 const db=new PGlite();try{
  await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid,email text,created_at timestamptz,last_sign_in_at timestamptz,email_confirmed_at timestamptz,raw_user_meta_data jsonb,encrypted_password text);
   CREATE SCHEMA medicea_billing;
   CREATE TABLE medicea_billing.entitlement(provider text,external_id text,member_id uuid,active boolean,valid_until timestamptz);
   CREATE TABLE medicea_billing.stripe_customer(member_id uuid,customer_id text);
   CREATE TABLE medicea_billing.complimentary_access(email text,active boolean);
   CREATE TABLE medicea_billing.play_purchase(member_id uuid,plan text,fulfilled boolean,revoked boolean,superseded boolean,verified_at timestamptz,voided_order_id text,token text);
   INSERT INTO auth.users(id,email) VALUES('11111111-1111-4111-8111-111111111111','fixture@example.test');`);
  await db.exec(fs.readFileSync('billing/migrations/20261123154942_owner_console_audit.sql','utf8'));
  await db.exec(fs.readFileSync('billing/migrations/20261123163015_owner_console_token_boundary.sql','utf8'));
  await db.exec('SET ROLE medicea_console_server');
  assert.equal((await db.query('SELECT email FROM medicea_billing.console_account')).rows[0].email,'fixture@example.test');
  for(const sql of ['SELECT encrypted_password FROM auth.users','SELECT token FROM medicea_billing.play_purchase','SELECT external_id FROM medicea_billing.entitlement','UPDATE medicea_billing.entitlement SET active=false','DELETE FROM medicea_billing.console_audit','UPDATE medicea_billing.console_audit SET action=\'rewrite\''])await assert.rejects(()=>db.query(sql));
  await db.query("INSERT INTO medicea_billing.console_audit(actor_id,action) VALUES('11111111-1111-4111-8111-111111111111','test')");
  assert.equal((await db.query('SELECT count(*) FROM medicea_billing.console_audit')).rows[0].count,1);
 }finally{await db.close();}
});
