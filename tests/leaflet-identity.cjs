const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
function loader(overrides={}){const cache={};return function read(file){if(cache[file])return cache[file];const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(code,{module,exports:module.exports,URL,Date,Response,Request,Headers,Buffer,process:{env:{}},console,require:name=>overrides[name]||(name.startsWith('.')?read(path.join(path.dirname(file),name+'.ts')):name.startsWith('@/')?read(name.slice(2)+'.ts'):require(name))});return cache[file]=module.exports;};}
const read=loader(),{leafletIdentity,leafletIdentityMessages}=read('app/lib/leaflet-identity.ts');
const source='https://regulator.example/product';
const profile={name:'Fictional product 5 mg tablets',country:'Italy',ingredients:[{name:'Example active',strength:'5 mg per tablet'}],form:'film-coated tablet',route:'oral',release:'immediate-release',supplier:'Supplier A',product_identifier:{system:'AIC',value:'123456789'},pack_size:'16 tablets',sources:[source],token:'private-selection-token',privateNote:'must not propagate'};
test('handoff retains exact identity without forwarding tokens or unrelated fields',()=>{
 const identity=leafletIdentity(profile,profile.name,'Italy');
 assert.equal(identity.productName,profile.name);assert.equal(identity.supplier,'Supplier A');assert.equal(identity.productIdentifier.value,'123456789');assert.equal(identity.packSize,'16 tablets');assert.equal(identity.sources[0],source);assert.equal(identity.ingredients[0].strength,'5 mg per tablet');
 const messages=leafletIdentityMessages(identity,'5 mg');assert.match(messages[0].content,/not instructions/);assert.match(messages[0].content,/userEnteredDosageHint/);assert.doesNotMatch(messages[0].content,/private-selection-token|must not propagate/);
 const unknown=leafletIdentity({...profile,supplier:undefined,product_identifier:undefined,pack_size:undefined},profile.name,'Italy');assert.equal(unknown.packSize,undefined);assert.equal(unknown.supplier,undefined);assert.equal(unknown.productIdentifier,undefined);
});
test('context cannot silently cross a product or country and unsafe sources are dropped',()=>{
 const identity=leafletIdentity(profile,profile.name,'Italy');
 assert.equal(leafletIdentity(identity,'Another product','Italy'),undefined);assert.equal(leafletIdentity(identity,profile.name,'United Kingdom'),undefined);
 assert.equal(leafletIdentity({...profile,ingredients:[]},profile.name,'Italy'),undefined);
 const safe=leafletIdentity({...profile,sources:['file:///private','https://user:secret@example.org/x',source]},profile.name,'Italy');assert.deepEqual([...safe.sources],[source]);
 assert.equal(leafletIdentity({...profile,product_identifier:{system:'dm+d VMP',value:'generic-group'}},profile.name,'Italy').productIdentifier,undefined);
});
test('actual leaflet route supplies selected context and previously ignored hint to provider',async()=>{
 const requests=[];
 const route=loader({'@/lib/membership/meter':{withMembership:run=>run},'next/server':{NextResponse:Response},'@/app/lib/openaiClient':{openaiFetch:async(url,init)=>{requests.push(JSON.parse(init.body));return Response.json({choices:[{message:{content:'{"leaflet_text":"Summary: Fictional test"}'}}]});}}})('app/api/openai/leaflet/route.ts');
 const identity=leafletIdentity(profile,profile.name,'Italy');
 const response=await route.POST(new Request('https://preview.example/api/openai/leaflet',{method:'POST',body:JSON.stringify({originCountry:'Italy',drugName:profile.name,drugDosage:'5 mg',lang:'en',selectedProduct:identity})}));
 assert.equal(response.status,200);assert.equal(requests.length,1);assert.equal(requests[0].messages.length,3);
 const supplied=JSON.parse(requests[0].messages[2].content.split('\n').slice(1).join('\n'));assert.equal(supplied.selectedProduct.supplier,'Supplier A');assert.equal(supplied.selectedProduct.packSize,'16 tablets');assert.equal(supplied.userEnteredDosageHint,'5 mg');
 const invalid=await route.POST(new Request('https://preview.example/api/openai/leaflet',{method:'POST',body:JSON.stringify({originCountry:'United Kingdom',drugName:profile.name,selectedProduct:identity})}));assert.equal(invalid.status,400);assert.equal(requests.length,1);
});
test('unselected lookup remains compatible while dosage hint is no longer ignored',()=>{
 assert.equal(leafletIdentityMessages(undefined,'').length,0);
 const message=leafletIdentityMessages(undefined,'5 mg')[0].content;assert.match(message,/unverified input/);assert.equal(JSON.parse(message.split('\n').slice(1).join('\n')).userEnteredDosageHint,'5 mg');
});
test('saved equivalent identity survives restoration without persisting selection tokens',()=>{
 const {normalizeSavedSearch}=read('app/lib/saved-searches.ts');const identity=leafletIdentity(profile,profile.name,'Italy');
 const saved=normalizeSavedSearch({id:'fixture',savedAt:'2026-11-12T00:00:00Z',mode:'international',selectedDrug:'Fictional origin',originCode:'Belgium',targetCode:'Italy',matches:[{medicine_name:profile.name,medicineIdentity:{...identity,token:'private-selection-token'}}]});
 assert.equal(saved.matches[0].medicineIdentity.productIdentifier.value,'123456789');assert.equal(saved.matches[0].ingredients[0].strength,'5 mg per tablet');assert.doesNotMatch(JSON.stringify(saved),/private-selection-token/);
});
test('client and membership paths both pass selected profiles while matching keeps signed origin selection',()=>{
 const client=fs.readFileSync('app/MedicineWorkspace.tsx','utf8'),member=fs.readFileSync('app/api/membership/search/route.ts','utf8');
 assert.match(client,/selectedProduct:leafletIdentity\(selection,selection.name,originCountry\)/);assert.match(client,/selectedProduct:leafletIdentity\(profile,medicineName,country\)/);assert.match(client,/originSelection:selection.token/);assert.match(member,/selectedProduct:leafletIdentity\(selected,selected.name,body.originCountry\)/);
});
