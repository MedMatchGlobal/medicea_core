const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const id='f2ac5baa-06ad-4cbc-a123-a85313ccef15';
function harness({allowed=true,record=null}={}){
  const calls=[];
  const query={select(){return this;},eq(key,value){calls.push([key,value]);return this;},async maybeSingle(){return {data:record,error:null};}};
  const module={exports:{}};
  const source=fs.readFileSync(path.join(__dirname,'../app/vault/documents/[id]/route.ts'),'utf8');
  const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  const imports={
    '@/app/health-i18n/server':{healthServerText:async text=>text==='Document unavailable.'?'Document indisponible.':'Veuillez vérifier votre authentificateur.'},
    '@/lib/vault-files':{VAULT_BUCKET:'private',validDocumentId:value=>value===id},
    '@/lib/vault-access':{vaultAccess:async()=>allowed?{ok:true,user:{id:'secondary-account'},client:{from:()=>query,storage:{from:()=>({download:async()=>{calls.push(['download']);return {data:new Blob(['fictional']),error:null};}})}}}:{ok:false}},
  };
  vm.runInNewContext(output,{module,exports:module.exports,require:name=>imports[name],Response});
  return {get:module.exports.GET,calls};
}
test('localized download denial preserves MFA gating and does not query storage',async()=>{
  const h=harness({allowed:false});const response=await h.get(new Request('https://example.test'),{params:Promise.resolve({id})});
  assert.equal(response.status,403);assert.match(await response.text(),/authentificateur/);assert.deepEqual(h.calls,[]);
});
test('another account cannot download a missing owned record, even with its valid id',async()=>{
  const h=harness();const response=await h.get(new Request('https://example.test'),{params:Promise.resolve({id})});
  assert.equal(response.status,404);assert.equal(await response.text(),'Document indisponible.');assert.deepEqual(h.calls,[['id',id],['user_id','secondary-account']]);
  assert.equal(response.headers.get('Cache-Control'),'private, no-store');
});
test('an authorized attachment retains private download and sandbox headers',async()=>{
  const h=harness({record:{object_path:'secondary-account/private-file',mime_type:'image/png'}});
  const response=await h.get(new Request('https://example.test'),{params:Promise.resolve({id})});
  assert.equal(response.status,200);assert.equal(await response.text(),'fictional');
  assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');
  assert.match(response.headers.get('Content-Disposition'),/^attachment;/);
  assert.equal(response.headers.get('Content-Security-Policy'),"default-src 'none'; sandbox");
});
