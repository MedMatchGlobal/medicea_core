const test=require('node:test'),assert=require('node:assert/strict');
const load=require('./load-care.cjs');
const {CARE_SPECIALTY_GROUPS,filteredSpecialtyGroups,specialtySearchTerm}=load('app/lib/care-specialties.ts');
const care=load('app/lib/care-search.ts');
test('CSV column E parents contain column D labels without losing entries',()=>{
 assert.equal(CARE_SPECIALTY_GROUPS.length,135);
 assert.equal(CARE_SPECIALTY_GROUPS.filter(group=>group.items.length>1).length,49);
 const items=CARE_SPECIALTY_GROUPS.flatMap(group=>group.items);
 assert.equal(items.length,534);assert.equal(new Set(items.map(item=>item.id)).size,items.length);
 for(const group of CARE_SPECIALTY_GROUPS){assert.equal(group.items[0].id,group.id);assert.equal(group.items[0].parent,'');for(const item of group.items.slice(1))assert.equal(item.parent,group.id);}
 for(const item of items){assert.ok(item.query.trim());assert.ok(item.label.trim());}
 const geriatrics=CARE_SPECIALTY_GROUPS.find(group=>group.id==='geriatrics');assert.deepEqual(Array.from(geriatrics.items,item=>item.label),['Geriatrics','Orthogeriatrics','Memory and cognitive assessment','Falls and frailty clinic']);
});
test('cholesterol and kidney searches find the appropriate provider, including Italian aliases',()=>{
 for(const term of ['cholesterol','lipidologist','colesterolo'])assert.ok(filteredSpecialtyGroups({},'en',term).flatMap(group=>group.items).some(item=>item.id==='lipidology'));
 assert.ok(filteredSpecialtyGroups({},'en','kidney').flatMap(group=>group.items).some(item=>item.id==='nephrology'));
 assert.equal(specialtySearchTerm('neph'),'nephrologist');
 assert.equal(specialtySearchTerm('lipids'),'lipid clinic');
 assert.equal(care.careSearchTerm('doctor','physio'),'physiotherapist');
 assert.equal(care.careSearchTerm('hospital'),'hospitals');
});
test('localized labels preserve stable selection and queries; custom specialties are supported',()=>{
 const item=filteredSpecialtyGroups({neph:'Nefrologia'},'it').flatMap(group=>group.items).find(item=>item.id==='nephrology');
 assert.equal(item.label,'Nefrologia');assert.equal(item.query,'nephrologist');
 assert.equal(specialtySearchTerm('custom: Lipid clinic '),'Lipid clinic');
 assert.equal(care.careSearchUrl('doctor','Rome','custom:'),null);
});
test('Android handoff carries both coordinates and specialty; other devices retain browser maps',()=>{
 const ua='Mozilla/5.0 (Linux; Android 14)';
 for(const mode of ['pharmacy','hospital','gp','doctor','laboratory','imaging','physiotherapy']){
  const url=care.careLaunchUrl(mode,'41.9028,12.4964','neph',ua);
  assert.ok(url.startsWith('geo:41.9028,12.4964?'));
  const params=new URLSearchParams(url.split('?')[1]);assert.equal(params.get('q'),care.careSearchTerm(mode,'neph'));assert.equal(params.get('z'),'14');
 }
 assert.equal(care.careLaunchUrl('doctor','41.9028,12.4964','neph','desktop'),care.careSearchUrl('doctor','41.9028,12.4964','neph'));
 assert.ok(care.careLaunchUrl('doctor','Rome, Italy','neph',ua).startsWith('https://'));
 assert.equal(care.careLaunchUrl('hospital','','',ua),null);
 assert.equal(care.careLaunchUrl('hospital','91,10','',ua),null);
});

test('filtering a nested specialty keeps the correct parent and can reveal its siblings',()=>{
 const child=filteredSpecialtyGroups({},'en','glomerular');assert.equal(child.length,1);assert.equal(child[0].id,'nephrology');assert.equal(child[0].items[0].label,'Glomerular disease');
 const parent=filteredSpecialtyGroups({},'en','nephrology').find(group=>group.id==='nephrology');assert.equal(parent.items.length,5);
});
