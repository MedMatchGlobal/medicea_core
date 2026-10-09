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
function uploadHarness({allowed=true,uploadError=null,insertError=null,cleanupError=null}={}) {
  const calls=[];
  const storage={upload:async(...args)=>{calls.push(['upload',...args]);return {error:uploadError};},remove:async paths=>{calls.push(['remove',paths]);return {error:cleanupError};}};
  const actions=load('app/vault/actions.ts',{
    'node:crypto':{randomUUID:()=> 'f2ac5baa-06ad-4cbc-a123-a85313ccef15'},
    'next/cache':{revalidatePath:p=>calls.push(['refresh',p])},
    '@/lib/vault-access':{vaultAccess:async()=>allowed?{ok:true,user:{id:'owner'},client:{storage:{from:()=>storage},from:()=>({insert:async row=>{calls.push(['insert',row]);return {error:insertError};}})}}:{ok:false}},
    '@/lib/vault-files':files,
  });
  return {calls,upload:actions.uploadDocument};
}
function uploadForm(bytes=new Uint8Array([37,80,68,70,45]),name='test.pdf',type='application/pdf') {
  const form=new FormData();
  form.set('title',' Fictional test report ');form.set('fictional','yes');
  form.set('document',new File([bytes],name,{type}));return form;
}
test('upload rejects missing consent, title, empty, oversized and disguised files before storage',async()=>{
  const forms=[uploadForm(new Uint8Array()),uploadForm(new Uint8Array(files.MAX_FILE_BYTES+1)),uploadForm(new TextEncoder().encode('not a PDF'),'renamed.pdf')];
  const noConsent=uploadForm();noConsent.delete('fictional');forms.push(noConsent);
  const noTitle=uploadForm();noTitle.set('title','');forms.push(noTitle);
  for(const form of forms){const h=uploadHarness();assert.ok((await h.upload(form)).error);assert.deepEqual(h.calls,[]);}
  const h=uploadHarness({allowed:false});assert.ok((await h.upload(uploadForm())).error);assert.deepEqual(h.calls,[]);
});
test('exactly 3 MiB is accepted with a generated owner path and detected MIME',async()=>{
  const bytes=new Uint8Array(files.MAX_FILE_BYTES);bytes.set([37,80,68,70,45]);
  const h=uploadHarness();assert.ok((await h.upload(uploadForm(bytes,'../../fake.png','text/plain'))).success);
  const uploaded=h.calls[0];assert.equal(uploaded[1],'owner/f2ac5baa-06ad-4cbc-a123-a85313ccef15.pdf');
  assert.equal(uploaded[3].contentType,'application/pdf');assert.equal(uploaded[3].upsert,false);
  assert.equal(h.calls[1][1].size_bytes,files.MAX_FILE_BYTES);assert.equal(h.calls[1][1].title,'Fictional test report');
  assert.equal(h.calls[2][0],'refresh');
});
test('storage failure never creates a document listing or reports success',async()=>{
  const h=uploadHarness({uploadError:{message:'private provider diagnostic'}});
  const result=await h.upload(uploadForm());assert.ok(result.error);assert.equal(result.success,undefined);
  assert.deepEqual(h.calls.map(c=>c[0]),['upload']);assert.ok(!result.error.includes('private provider'));
});
test('listing failure removes only the uploaded object and does not report success',async()=>{
  const h=uploadHarness({insertError:{message:'database unavailable'}});
  assert.ok((await h.upload(uploadForm())).error);
  assert.deepEqual(h.calls.map(c=>c[0]),['upload','insert','remove']);
  assert.deepEqual(Array.from(h.calls[2][1]),[h.calls[0][1]]);
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
