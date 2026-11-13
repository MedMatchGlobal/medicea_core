const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const load=require('./load-care.cjs');
const emergency=load('app/lib/emergency.ts');
const care=load('app/lib/care-search.ts');
test('care categories stay distinct and bypass AI modes',()=>{
 for(const [mode,query] of Object.entries({laboratory:'medical laboratories blood tests pathology patient collection centres',imaging:'private diagnostic imaging radiology X-ray CT MRI ultrasound centres',physiotherapy:'physiotherapists physical therapy clinics'})){
  assert.ok(care.isCareMode(mode));assert.equal(care.careSearchQuery(mode,'  Carrara  ','Cardiology'),query+' near Carrara');
 }
 for(const mode of ['international','pets','generic','condition','triage','unknown'])assert.equal(care.isCareMode(mode),false);
 assert.equal(care.careSearchQuery('doctor','Rome','Cardiology'),'cardiologist near Rome');
});
test('only curated countries return emergency numbers with an official source',()=>{
 for(const [country,number] of Object.entries({IT:'112',FR:'112',DE:'112',GB:'999',US:'911',CA:'911',AU:'000'})){
  assert.equal(emergency.emergencyNumber(country.toLowerCase()),number);assert.match(emergency.emergencySource(country),/^https:\/\//);
 }
 for(const country of ['', 'other','ZZ','IN','112','__proto__','constructor']) assert.equal(emergency.emergencyNumber(country),null);
 for(const country of emergency.EMERGENCY_COUNTRIES){assert.match(emergency.emergencyNumber(country),/^\d{3}$/);assert.ok(emergency.emergencySource(country));}
});
function geo(coords={latitude:44,longitude:10}){return{getCurrentPosition(success,failure,options){assert.equal(options.maximumAge,0);success({coords});}};}
test('GPS uses explicit live coordinates, omits cookies and accepts valid country data',async()=>{
 let called=0;
 const code=await emergency.detectEmergencyCountry(geo(),async(url,options)=>{
  called++;const parsed=new URL(url);assert.equal(parsed.hostname,'api.bigdatacloud.net');assert.equal(parsed.searchParams.get('latitude'),'44');assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');assert.equal(options.cache,'no-store');return{ok:true,json:async()=>({countryCode:'IT'})};
 });assert.equal(code,'IT');assert.equal(called,1);
});
test('denied, cancelled or invalid GPS never falls back to IP lookup',async()=>{
 let called=0;const request=async()=>{called++;throw Error('must not call');};
 await assert.rejects(()=>emergency.detectEmergencyCountry({getCurrentPosition(ok,fail){fail(Error('Denied'));}},request));
 const controller=new AbortController();controller.abort();await assert.rejects(()=>emergency.detectEmergencyCountry(geo(),request,controller.signal));
 await assert.rejects(()=>emergency.detectEmergencyCountry(geo({latitude:91,longitude:0}),request));
 assert.equal(called,0);
});
test('geocoder failures or invalid country data cannot produce a dial number',async()=>{
 for(const response of [{ok:false},{ok:true,json:async()=>({countryCode:'112'})},{ok:true,json:async()=>({})}])await assert.rejects(()=>emergency.detectEmergencyCountry(geo(),async()=>response));
 assert.equal(await emergency.detectEmergencyCountry(geo(),async()=>({ok:true,json:async()=>({countryCode:'IN'})})),'IN');assert.equal(emergency.emergencyNumber('IN'),null);
});
test('new care labels exist in every supported language',()=>{
 for(const lang of ['en','af','ar','cs','da','de','el','es','fi','fr','he','hi','hu','it','ja','ko','nl','no','pl','pt','ro','ru','sv','tr','zh']){
  const {ui}=JSON.parse(fs.readFileSync('app/i18n/'+lang+'.json','utf8'));
  for(const key of ['btnLaboratory','btnImaging','btnPhysiotherapy','emergencyButton'])assert.ok(ui[key]?.trim(),lang+key);
 }
});

test('device coordinates retain reported accuracy and IP fallback requests no coordinates',async()=>{
 const location=await emergency.currentEmergencyLocation(geo({latitude:44,longitude:10,accuracy:12}));
 assert.equal(location.accuracy,12);
 const code=await emergency.lookupEmergencyCountry(async(url,options)=>{
  const params=new URL(url).searchParams;
  assert.equal(params.has('latitude'),false);assert.equal(params.has('longitude'),false);
  assert.equal(options.credentials,'omit');return{ok:true,json:async()=>({countryCode:'GB'})};
 },null);
 assert.equal(code,'GB');
 const controller=new AbortController();controller.abort();
 await assert.rejects(()=>emergency.lookupEmergencyCountry(()=>assert.fail('Cancelled lookup called provider'),null,controller.signal));
});

function addressRoute(key,request){
 const module={exports:{}};
 const js=ts.transpileModule(fs.readFileSync('app/api/emergency/address/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 vm.runInNewContext(js,{module,exports:module.exports,URL,URLSearchParams,AbortSignal,process:{env:{SOS_GEOCODING_API_KEY:key}},fetch:request,require:()=>({NextResponse:{json:(data,options)=>({data,...options})}})});
 return module.exports.POST;
}
const addressRequest=(body,origin='https://example.test')=>new Request('https://example.test/api/emergency/address',{method:'POST',headers:{origin},body:JSON.stringify(body)});
test('street lookup rejects foreign origins and invalid coordinates before contacting provider',async()=>{
 const post=addressRoute('test-key',()=>assert.fail('Must not call provider'));
 assert.equal((await post(addressRequest({latitude:44,longitude:10},'https://other.test'))).status,403);
 for(const body of [{latitude:91,longitude:0},{latitude:0,longitude:181},{latitude:'44',longitude:10},{}])assert.equal((await post(addressRequest(body))).status,400);
});
test('street lookup without configuration has an honest unavailable fallback',async()=>{
 const result=await addressRoute(undefined,()=>assert.fail('No key must mean no request'))(addressRequest({latitude:44,longitude:10}));
 assert.equal(result.data.address,null);assert.equal(result.headers['Cache-Control'],'no-store');
});
test('street lookup returns only the address, keeps provider credentials server-side and handles outages',async()=>{
 const result=await addressRoute('test-key',async(url,options)=>{
  const parsed=new URL(url);assert.equal(parsed.hostname,'maps.googleapis.com');assert.equal(parsed.searchParams.get('latlng'),'44,10');assert.equal(options.cache,'no-store');
  return{ok:true,json:async()=>({status:'OK',results:[{formatted_address:'Example street'}]})};
 })(addressRequest({latitude:44,longitude:10}));
 assert.equal(result.data.address,'Example street');assert.doesNotMatch(JSON.stringify(result),/test-key/);
 assert.equal((await addressRoute('test-key',async()=>{throw Error('Offline');})(addressRequest({latitude:44,longitude:10}))).data.address,null);
});
