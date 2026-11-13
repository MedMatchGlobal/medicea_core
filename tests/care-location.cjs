const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const load=require('./load-care.cjs');
const care=load('app/lib/care-search.ts'),{locateCare}=load('app/lib/care-location.ts');
test('every care service anchors GPS searches to supplied coordinates without free-text near coordinates',()=>{
 for(const mode of ['pharmacy','gp','doctor','hospital','laboratory','imaging','physiotherapy']){
  const u=new URL(care.careSearchUrl(mode,'41.9028,12.4964','Cardiology'));
  assert.equal(u.origin,'https://www.google.com');assert.ok(u.pathname.endsWith('/@41.9028,12.4964,14z'));assert.equal(u.search,'');
  assert.doesNotMatch(decodeURIComponent(u.pathname),/near 41|United Kingdom|Italy|medicine/);
 }
 assert.match(decodeURIComponent(care.careSearchUrl('doctor','41.9028,12.4964','Cardiology')),/cardiologist/);
});
test('address searches preserve explicit destination, escape input, and retain service category',()=>{
 const u=new URL(care.careSearchUrl('pharmacy',' Rome, Italy & query=UK '));assert.equal(u.searchParams.get('query'),'pharmacies near Rome, Italy & query=UK');assert.equal(u.searchParams.getAll('query').length,1);
 assert.equal(new URL(care.careSearchUrl('gp','Brussels, Belgium')).searchParams.get('query'),'general practitioner near Brussels, Belgium');
});
test('blank, near-me fallback and invalid coordinate pairs cannot create a map link',()=>{
 for(const v of ['','  ','near me','91,10','44,181','1,2,3'])assert.equal(care.careSearchUrl('hospital',v),null);
 for(const v of ['0,0','-33.8,151.2','90,-180'])assert.ok(care.careSearchUrl('gp',v));
});
test('nearby search accepts a recent sufficiently accurate device fix',async()=>{
 const controller=new AbortController();const result=await locateCare({getCurrentPosition(ok,fail,opts){assert.equal(opts.enableHighAccuracy,false);assert.equal(opts.maximumAge,30000);assert.equal(opts.timeout,5000);ok({coords:{latitude:41.9028,longitude:12.4964,accuracy:40}});}},controller.signal);assert.equal(result,'41.9028,12.4964');
});
test('denial, timeout and unavailable positions are explicit errors, never near me',async()=>{
 for(const [code,message]of [[1,'denied'],[2,'unavailable'],[3,'timeout']])await assert.rejects(locateCare({getCurrentPosition(ok,fail){fail({code});}},new AbortController().signal),new RegExp(message));
 await assert.rejects(locateCare({getCurrentPosition(ok){ok({coords:{latitude:NaN,longitude:12}});}},new AbortController().signal),/unavailable/);
});
test('toggling off or leaving the view invalidates late GPS completion',async()=>{
 const c=new AbortController();let done;const result=locateCare({getCurrentPosition(ok){done=ok;}},c.signal);c.abort();await assert.rejects(result,/cancelled/);done({coords:{latitude:1,longitude:2}});
 let calls=0;await assert.rejects(locateCare({getCurrentPosition(){calls++;}},c.signal),/cancelled/);assert.equal(calls,0);
});

test('a slow or coarse first fix gets one fresh high-accuracy attempt',async()=>{
 for(const reason of ['timeout','coarse']){
  let calls=0;const result=await locateCare({getCurrentPosition(ok,fail,options){calls++;if(calls===1){if(reason==='timeout')fail({code:3});else ok({coords:{latitude:41.9,longitude:12.4,accuracy:25000}});}else{assert.equal(options.enableHighAccuracy,true);assert.equal(options.maximumAge,0);assert.equal(options.timeout,15000);ok({coords:{latitude:41.9028,longitude:12.4964,accuracy:25}});}}},new AbortController().signal);
  assert.equal(result,'41.9028,12.4964');assert.equal(calls,2);
 }
});
test('permission denial never retries and excessively coarse final fixes are rejected',async()=>{
 let calls=0;await assert.rejects(locateCare({getCurrentPosition(ok,fail){calls++;fail({code:1});}},new AbortController().signal),/denied/);assert.equal(calls,1);
 calls=0;await assert.rejects(locateCare({getCurrentPosition(ok){calls++;ok({coords:{latitude:41.9,longitude:12.4,accuracy:25000}});}},new AbortController().signal),/unavailable/);assert.equal(calls,2);
});
test('aborting the first attempt prevents a second GPS request',async()=>{
 const c=new AbortController();let fail,calls=0;
 const promise=locateCare({getCurrentPosition(ok,error){calls++;fail=error;}},c.signal);
 c.abort();fail({code:3});await assert.rejects(promise,/cancelled/);assert.equal(calls,1);
});
test('timeout status exposes a direct retry without a form submission',()=>{
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
 const Status=load('app/components/CareLocationStatus.tsx').default;
 const html=renderToStaticMarkup(React.createElement(Status,{enabled:true,pending:false,error:'timeout',coordinates:'',lang:'en',onRetry(){}}));
 assert.match(html,/role="alert"/);assert.match(html,/enter a town or address above/);assert.match(html,/<button type="button"[^>]*>Try again<\/button>/);
});
