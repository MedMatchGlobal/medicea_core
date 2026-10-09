const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, imports = {}, env = {}) {
  const module = {exports:{}};
  const source = fs.readFileSync(path.join(__dirname,'..',file),'utf8');
  const output = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  vm.runInNewContext(output,{module,exports:module.exports,require:name=>{if(!(name in imports)) throw Error(`Unexpected import ${name}`);return imports[name];},process:{env},Uint8Array,File,FormData});
  return module.exports;
}
const files = load('lib/vault-files.ts');
function intakeHarness({allowed=true}={}) {
 const calls=[];
 const actions=load('app/vault/actions.ts',{
  'next/cache':{revalidatePath:p=>calls.push(['refresh',p])},
  '@/lib/vault-storage':{privateObject:async()=>{throw Error('unexpected');}},
  '@/lib/vault-access':{vaultAccess:async()=>allowed?{ok:true,user:{id:'owner'},client:{from:()=>({select(){return this;},eq(){return this;},limit:async()=>({data:[]})}),rpc:async(name,args)=>{calls.push([name,args]);return {data:{id:'generated',user_id:'owner',object_path:'owner/generated.pdf'},error:null};}}}:{ok:false}},
  '@/lib/vault-files':files,
 });return {actions,calls};
}
test('reservation rejects missing consent, invalid MIME, title, size and non-MFA sessions',async()=>{
 const valid={title:'Fictional',size:50000000,mime:'application/pdf',fictional:true};
 for(const change of [{fictional:false},{size:0},{size:50000001},{size:1.5},{mime:'video/mp4'},{title:''}]){
  const h=intakeHarness();assert.ok((await h.actions.beginDocument({...valid,...change})).error);assert.equal(h.calls.length,0);
 }
 const h=intakeHarness({allowed:false});assert.ok((await h.actions.beginDocument(valid)).error);assert.equal(h.calls.length,0);
});
test('exact 50 decimal MB reservation allocates through quota-checked RPC without file bytes',async()=>{
 const h=intakeHarness();assert.ok((await h.actions.beginDocument({title:' Fictional ',size:50000000,mime:'application/pdf',fictional:true})).intake);
 assert.equal(h.calls[0][0],'vault_begin_upload');assert.equal(h.calls[0][1].p_size,50000000);assert.equal(h.calls[0][1].p_title,'Fictional');assert.equal(files.MAX_FILE_BYTES,50000000);
});
test('file validation rejects unsupported and truncated formats',()=>{
  for(const bytes of [[],[255,216],[137,80,78],[60,104,116,109,108,62]]) assert.equal(files.documentType(new Uint8Array(bytes)),null);
  assert.equal(files.documentType(new Uint8Array([37,80,68,70,45])).mime,'application/pdf');
  assert.equal(files.documentType(new Uint8Array([137,80,78,71,13,10,26,10])).mime,'image/png');
  assert.equal(files.documentType(new Uint8Array([255,216,255])).mime,'image/jpeg');
});
test('titles and download identifiers reject control characters and path injection',()=>{
  for(const title of ['', ' '.repeat(20),'x'.repeat(121),'hello\r\nworld',null]) assert.equal(files.documentTitle(title),null);
  assert.equal(files.documentTitle(' Test report '),'Test report');
  for(const id of ['../other-user','abc','f2ac5baa-06ad-4cbc-a123-a85313ccef15/extra']) assert.equal(files.validDocumentId(id),false);
  assert.equal(files.validDocumentId('f2ac5baa-06ad-4cbc-a123-a85313ccef15'),true);
});
test('vault access fails closed unless configured, signed in and AAL2',async()=>{
  async function run({enabled=true,configured=true,user={id:'user-a'},userError=null,aal='aal2',aalError=null}) {
    let calls=0;
    const client={auth:{getUser:async()=>({data:{user},error:userError}),mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:aal},error:aalError})}}};
    const access=load('lib/vault-access.ts',{'./supabase/server':{authConfigured:()=>configured,accountClient:async()=>{calls++;return client;}}},{MEDICEA_VAULT_BETA_ENABLED:enabled?'true':'false'});
    return {result:await access.vaultAccess(),calls};
  }
  assert.equal((await run({enabled:false})).calls,0);
  assert.equal((await run({configured:false})).result.reason,'disabled');
  assert.equal((await run({user:null})).result.reason,'signin');
  assert.equal((await run({userError:{message:'invalid session'}})).result.reason,'signin');
  assert.equal((await run({aal:'aal1'})).result.reason,'mfa');
  assert.equal((await run({aalError:{message:'provider failed'}})).result.reason,'mfa');
  assert.equal((await run({aal:null})).result.ok,false);
  assert.equal((await run({})).result.ok,true);
});
