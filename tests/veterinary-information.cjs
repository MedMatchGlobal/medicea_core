const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
function load(file, overrides = {}) {
  const source = fs.readFileSync(file, 'utf8');
  const output = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  const module = {exports:{}};
  vm.runInNewContext(output, {module,exports:module.exports,require(name){
    if (overrides[name]) return overrides[name];
    if (name.startsWith('.')) return load(path.resolve(path.dirname(file),name+'.ts'),overrides);
    return require(name);
  }});
  return module.exports;
}
const root = path.join(__dirname,'..');
test('origin veterinary composition and medicine-information controls render with safe text', () => {
  const helpers = load(path.join(root,'app/lib/veterinary-details.ts'));
  const ingredients = helpers.veterinaryIngredients({active_ingredients:[{name:'ExampleIngredient',strength:'25 mg'},null,{name:14}]});
  assert.equal(ingredients.length,1);
  const Card = load(path.join(root,'app/components/PetMedicineInformation.tsx')).default;
  const html = renderToStaticMarkup(React.createElement(Card, {
    medicineName:'FictionalVetDrug <img>',country:'Italy',lang:'en',ingredients,
    ingredientLabel:'Active ingredients',loadingLabel:'Searching…',errorLabel:'Unavailable',
  }));
  assert.match(html,/ExampleIngredient/);
  assert.match(html,/25 mg/);
  assert.match(html,/View medicéa leaflet/);
  assert.match(html,/Find official leaflet/);
  assert.match(html,/FictionalVetDrug &lt;img&gt;/);
  assert.doesNotMatch(html,/<img>/);
  assert.equal(new URL(helpers.officialVeterinaryLeafletSearch('Drug & name','Italy')).searchParams.get('q'),'Drug & name Italy official veterinary package leaflet manufacturer regulator');
});
test('veterinary summary uses the requested product, country and language without claiming an official leaflet', async () => {
  const calls=[];
  const api = load(path.join(root,'app/api/openai/veterinary-information/route.ts'), {
    'next/server':{NextResponse:{json:Response.json}},
    '@/app/lib/openaiClient':{openaiFetch:async (url,options) => {
      calls.push(JSON.parse(options.body));
      return Response.json({choices:[{message:{content:JSON.stringify({information_text:'Fictional veterinary summary'})}}]});
    }},
  });
  const response=await api.POST({json:async()=>({drugName:'FictionalVetDrug',originCountry:'Italy',lang:'it'})});
  const payload=await response.json();
  assert.equal(payload.kind,'ai_veterinary_summary');
  assert.equal(payload.information_text,'Fictional veterinary summary');
  assert.equal(calls[0].model,'gpt-4o');
  assert.equal(calls[0].temperature,0.2);
  assert.match(calls[0].messages[0].content,/not an official package leaflet/);
  assert.match(calls[0].messages[0].content,/Do not give dosing instructions/);
  assert.match(calls[0].messages[1].content,/Requested language: it/);
  assert.match(calls[0].messages[1].content,/Country: "Italy"/);
  assert.match(calls[0].messages[1].content,/Veterinary product name: "FictionalVetDrug"/);
  const invalid=await api.POST({json:async()=>({drugName:'',originCountry:'Italy'})});
  assert.equal(invalid.status,400);
  assert.equal(calls.length,1);
});
test('veterinary summary fails cleanly on empty provider content', async () => {
  const api = load(path.join(root,'app/api/openai/veterinary-information/route.ts'), {
    'next/server':{NextResponse:{json:Response.json}},
    '@/app/lib/openaiClient':{openaiFetch:async()=>Response.json({choices:[{message:{content:'{}'}}]})},
  });
  const response=await api.POST({json:async()=>({drugName:'FictionalVetDrug',originCountry:'Italy'})});
  assert.equal(response.status,502);
});

test('shared medicéa leaflet labels cover every language and human official searches use human terms', () => {
  const {leafletActions} = load(path.join(root,'app/i18n/leaflet-actions.ts'));
  for (const lang of ['en','af','ar','cs','da','de','el','es','fi','fr','he','hi','hu','it','ja','ko','nl','no','pl','pt','ro','ru','sv','tr','zh']) {
    assert.match(leafletActions(lang).view,/medicéa/);
    assert.match(leafletActions(lang).hide,/medicéa/);
    assert.ok(leafletActions(lang).official.trim());
  }
  const helpers=load(path.join(root,'app/lib/veterinary-details.ts'));
  const human=new URL(helpers.officialMedicineLeafletSearch('Example Human Drug','Italy')).searchParams.get('q');
  assert.match(human,/Example Human Drug Italy official package leaflet/);
  assert.doesNotMatch(human,/veterinary/);
});
