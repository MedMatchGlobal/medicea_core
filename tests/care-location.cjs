const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file){const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{module:m,exports:m.exports,require});return m.exports;}
const care=load('app/lib/care-search.ts'),{locateCare}=load('app/lib/care-location.ts');
test('every care service anchors GPS searches to supplied coordinates without free-text near coordinates',()=>{
 for(const mode of ['pharmacy','gp','doctor','hospital','laboratory','imaging','physiotherapy']){
  const u=new URL(care.careSearchUrl(mode,'41.9028,12.4964','Cardiology'));
  assert.equal(u.origin,'https://www.google.com');assert.ok(u.pathname.endsWith('/@41.9028,12.4964,14z'));assert.equal(u.search,'');
  assert.doesNotMatch(decodeURIComponent(u.pathname),/near 41|United Kingdom|Italy|medicine/);
 }
 assert.match(decodeURIComponent(care.careSearchUrl('doctor','41.9028,12.4964','Cardiology')),/Cardiology medical doctors/);
});
test('address searches preserve explicit destination, escape input, and retain service category',()=>{
 const u=new URL(care.careSearchUrl('pharmacy',' Rome, Italy & query=UK '));assert.equal(u.searchParams.get('query'),'pharmacies near Rome, Italy & query=UK');assert.equal(u.searchParams.getAll('query').length,1);
 assert.equal(new URL(care.careSearchUrl('gp','Brussels, Belgium')).searchParams.get('query'),'general practitioners family doctors near Brussels, Belgium');
});
test('blank, near-me fallback and invalid coordinate pairs cannot create a map link',()=>{
 for(const v of ['','  ','near me','91,10','44,181','1,2,3'])assert.equal(care.careSearchUrl('hospital',v),null);
 for(const v of ['0,0','-33.8,151.2','90,-180'])assert.ok(care.careSearchUrl('gp',v));
});
test('fresh GPS request uses accurate non-cached coordinates',async()=>{
 const controller=new AbortController();const result=await locateCare({getCurrentPosition(ok,fail,opts){assert.equal(opts.enableHighAccuracy,true);assert.equal(opts.maximumAge,0);assert.equal(opts.timeout,8000);ok({coords:{latitude:41.9028,longitude:12.4964}});}},controller.signal);assert.equal(result,'41.9028,12.4964');
});
test('denial, timeout and unavailable positions are explicit errors, never near me',async()=>{
 for(const [code,message]of [[1,'denied'],[2,'unavailable'],[3,'timeout']])await assert.rejects(locateCare({getCurrentPosition(ok,fail){fail({code});}},new AbortController().signal),new RegExp(message));
 await assert.rejects(locateCare({getCurrentPosition(ok){ok({coords:{latitude:NaN,longitude:12}});}},new AbortController().signal),/unavailable/);
});
test('toggling off or leaving the view invalidates late GPS completion',async()=>{
 const c=new AbortController();let done;const result=locateCare({getCurrentPosition(ok){done=ok;}},c.signal);c.abort();await assert.rejects(result,/cancelled/);done({coords:{latitude:1,longitude:2}});
 let calls=0;await assert.rejects(locateCare({getCurrentPosition(){calls++;}},c.signal),/cancelled/);assert.equal(calls,0);
});
