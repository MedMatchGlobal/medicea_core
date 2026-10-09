const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,imports,extras={}){const module={exports:{}};const source=fs.readFileSync(require('node:path').join(__dirname,'..',file),'utf8');const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 vm.runInNewContext(output,{module,exports:module.exports,require:name=>imports[name],URL,Uint8Array,Date,process:{env:{NEXT_PUBLIC_SUPABASE_URL:'https://example.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'public-key'}},...extras});return module.exports;}
test('each transfer chunk refreshes credentials; account changes and cancellation stop requests',async()=>{
 let session={user:{id:'owner'},access_token:'first'},stopped=false;
 const {documentTransfer}=load('lib/vault-transfer.ts',{'tus-js-client':{Upload:class{constructor(file,options){this.options=options;}}},'./vault-files':{VAULT_BUCKET:'private'}});
 const u=documentTransfer({auth:{getSession:async()=>({data:{session}})}},{},{user_id:'owner',object_path:'owner/id.pdf',mime_type:'application/pdf'},()=>{},()=>stopped);
 assert.equal(u.options.endpoint,'https://example.storage.supabase.co/storage/v1/upload/resumable');
 assert.equal(u.options.storeFingerprintForResuming,false);assert.equal(u.options.chunkSize,6*1024*1024);assert.equal(u.options.headers,undefined);
 const headers={};const request={setHeader:(key,value)=>headers[key]=value};
 await u.options.onBeforeRequest(request);assert.equal(headers.Authorization,'Bearer first');
 session.access_token='refreshed';await u.options.onBeforeRequest(request);assert.equal(headers.Authorization,'Bearer refreshed');
 session.user.id='secondary';await assert.rejects(()=>u.options.onBeforeRequest(request));
 session.user.id='owner';stopped=true;await assert.rejects(()=>u.options.onBeforeRequest(request));
 stopped=false;session=null;await assert.rejects(()=>u.options.onBeforeRequest(request));
});
function finalizer({allowed=true,size=5,mime='application/pdf',signature=[37,80,68,70,45],expired=false}={}){
 const calls=[];const id='f2ac5baa-06ad-4cbc-a123-a85313ccef15';
 const files=load('lib/vault-files.ts',{});
 const query={select(){return this;},eq(k,v){calls.push([k,v]);return this;},maybeSingle:async()=>({data:{id,object_path:'owner/'+id+'.pdf',size_bytes:5,mime_type:'application/pdf',expires_at:expired?'2000-01-01':'2100-01-01'},error:null})};
 const actions=load('app/vault/actions.ts',{'next/cache':{revalidatePath:()=>{}},'@/lib/vault-files':files,'@/lib/vault-storage':{privateObject:async()=>{calls.push(['range']);return new Response(new Uint8Array(signature),{status:206});}},'@/lib/vault-access':{vaultAccess:async()=>allowed?{ok:true,user:{id:'owner'},client:{from:()=>query,storage:{from:()=>({info:async()=>({data:{size,contentType:mime},error:null})})},rpc:async name=>{calls.push([name]);return {error:null};}}}:{ok:false}}},{Response});
 return {finish:()=>actions.finishDocument(id),calls};
}
test('completion rejects MFA failures, expiry, wrong stored size/type and disguised bytes',async()=>{
 for(const change of [{allowed:false},{expired:true},{size:4},{mime:'text/html'},{signature:[60,104,116,109,108]}]){const h=finalizer(change);assert.ok((await h.finish()).error);assert.ok(!h.calls.some(c=>c[0]==='vault_finish_upload'));}
});
test('completion validates stored bytes before calling the atomic registration RPC',async()=>{
 const h=finalizer();assert.ok((await h.finish()).success);assert.ok(h.calls.find(c=>c[0]==='user_id'&&c[1]==='owner'));
 assert.deepEqual(h.calls.slice(-2),[['range'],['vault_finish_upload']]);
});
test('private storage fetch uses a current token, encoded path, no caching or redirects',async()=>{
 let seen;
 const {privateObject}=load('lib/vault-storage.ts',{'./vault-files':{VAULT_BUCKET:'private'}},{fetch:async(url,options)=>{seen={url,options};return new Response('test');}});
 await privateObject({auth:{getSession:async()=>({data:{session:{access_token:'fresh'}}})}},'owner/a b.pdf','bytes=0-15');
 assert.match(seen.url,/owner\/a%20b.pdf$/);assert.equal(seen.options.headers.Authorization,'Bearer fresh');assert.equal(seen.options.headers.Range,'bytes=0-15');assert.equal(seen.options.cache,'no-store');assert.equal(seen.options.redirect,'error');
});
