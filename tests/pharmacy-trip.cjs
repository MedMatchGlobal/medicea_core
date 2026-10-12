const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const root=path.join(__dirname,'..');
function load(file) {
  const output=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  const module={exports:{}};
  vm.runInNewContext(output,{module,exports:module.exports,require(name){
    if(name.startsWith('.')) {const target=path.resolve(path.dirname(file),name);return load(fs.existsSync(target+'.ts')?target+'.ts':target+'.tsx');}
    return require(name);
  }});
  return module.exports;
}
test('pharmacy reminders retain the original and unique human or veterinary results safely',()=>{
  const {pharmacyReminder}=load(path.join(root,'app/lib/pharmacy-trip.ts'));
  assert.deepEqual(Array.from(pharmacyReminder(' Original ',[{medicine_name:'Generic A'},{Medicine_name:'Generic B'},{medicine_name:'Generic A'},null,{medicine_name:42}])),['Original','Generic A','Generic B']);
});
test('history markers preserve Next state without writing medicine data and distinguish Back from Forward',()=>{
  const {pharmacyHistoryEntry,isPharmacyTripEntry}=load(path.join(root,'app/lib/pharmacy-trip.ts'));
  const existing={__NA:true,tree:{segment:'pets'}};
  const trip={id:'opaque-trip-id',country:'Italy',medicines:['Private medicine name'],returnUrl:'/pets',scrollY:820};
  const forward=pharmacyHistoryEntry(existing,trip.id);
  assert.equal(forward.__NA,true);
  assert.equal(forward.tree,existing.tree);
  assert.equal(isPharmacyTripEntry(forward,trip),true);
  assert.equal(isPharmacyTripEntry(existing,trip),false);
  assert.equal(isPharmacyTripEntry(forward,null),false);
  assert.equal(isPharmacyTripEntry({mediceaPharmacyTrip:'another'},trip),false);
  assert.doesNotMatch(JSON.stringify(forward),/Private medicine name|Italy|820/);
});
test('pharmacy panel shows a return control and medicine names while its Maps URL contains only the location',()=>{
  const Panel=load(path.join(root,'app/components/PharmacyTripPanel.tsx')).default;
  const html=renderToStaticMarkup(React.createElement(Panel,{
    trip:{id:'test',country:'Italy',medicines:['Original <script>','Generic A'],returnUrl:'/pets',scrollY:820},
    lang:'en',onBack(){},title:'Search pharmacy',addressLabel:'Address',addressPlaceholder:'Town',useLocationLabel:'Use device location',openLabel:'Open in Google Maps',notice:'Verify listings',
  }));
  assert.match(html,/Back to medicine results/);
  assert.match(html,/Original &lt;script&gt;/);
  assert.match(html,/Generic A/);
  assert.doesNotMatch(html,/<script>/);
  assert.match(html,/pharmacies%20near%20Italy/);
  const {pharmacyTripCopy}=load(path.join(root,'app/i18n/pharmacy-trip.ts'));
  for(const lang of ['en','af','ar','cs','da','de','el','es','fi','fr','he','hi','hu','it','ja','ko','nl','no','pl','pt','ro','ru','sv','tr','zh']) {
    assert.ok(pharmacyTripCopy(lang).back.trim());
    assert.ok(pharmacyTripCopy(lang).reminder.trim());
    if(lang!=='en') assert.notEqual(pharmacyTripCopy(lang).back,pharmacyTripCopy('en').back);
  }
});
