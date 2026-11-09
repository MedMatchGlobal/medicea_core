const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
function load(file) {
 const module={exports:{}};
 const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 vm.runInNewContext(js,{module,exports:module.exports,URLSearchParams,require});return module.exports;
}
const emergency=load('app/lib/emergency.ts');
const care=load('app/lib/care-search.ts');
test('care categories stay distinct and bypass AI modes',()=>{
 for(const [mode,query] of Object.entries({laboratory:'medical laboratories blood tests pathology patient collection centres',imaging:'private diagnostic imaging radiology X-ray CT MRI ultrasound centres',physiotherapy:'physiotherapists physical therapy clinics'})){
  assert.ok(care.isCareMode(mode));assert.equal(care.careSearchQuery(mode,'  Carrara  ','Cardiology'),query+' near Carrara');
 }
 for(const mode of ['international','pets','generic','condition','triage','unknown'])assert.equal(care.isCareMode(mode),false);
 assert.equal(care.careSearchQuery('doctor','Rome','Cardiology'),'Cardiology medical doctors near Rome');
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
