const test=require('node:test'),assert=require('node:assert/strict');
const load=require('./load-care.cjs');
const {specialtyPickerNodes}=load('app/lib/care-specialty-navigation.ts');
const {CARE_SPECIALTY_GROUPS}=load('app/lib/care-specialties.ts');
function leaves(nodes){return nodes.flatMap(node=>node.item?[node.item]:leaves(node.children));}
function find(nodes,id){for(const node of nodes){if(node.id===id)return node;const child=find(node.children,id);if(child)return child;}}
test('umbrella navigation preserves every original specialty and its search term exactly once',()=>{
 const expected=CARE_SPECIALTY_GROUPS.flatMap(group=>group.items),actual=leaves(specialtyPickerNodes());
 assert.equal(actual.length,534);assert.equal(new Set(actual.map(item=>item.id)).size,534);
 for(const item of expected){const match=actual.find(candidate=>candidate.id===item.id);assert.equal(match.label,item.label);assert.equal(match.query,item.query);}
});
test('owner-requested umbrellas contain their specialties and preserve deeper branches',()=>{
 const nodes=specialtyPickerNodes();
 for(const [parent,ids] of Object.entries({umbrella_sexual_health:['andrology_male_reproductive_health','sexual_medicine_sexology','sexual_health_genitourinary_medicine'],fertility_and_assisted_reproduction:['midwifery','gender_affirming_medicine'],paediatrics:['child_and_adolescent_psychiatry','child_psychology','paediatric_dentistry','paediatric_dentistry_children'],psychiatry:['addiction_medicine','clinical_neurophysiology','neuropsychology','sleep_medicine','sleep_medicine_neurological'],umbrella_radiology:['radiology','interventional_radiology','nuclear_medicine','radiography_and_sonography'],umbrella_dental:['general_dentistry','orthodontics','endodontics','dental_hygiene'],umbrella_oncology:['medical_oncology','clinical_oncology','radiation_oncology','surgical_oncology_2','cardio_oncology','oncology_dietetics']})){
  const group=find(nodes,parent);assert.ok(group,parent);for(const id of ids)assert.ok(find(group.children,id),parent+':'+id);
 }
 assert.ok(find(find(nodes,'psychiatry').children,'sleep_medicine').children.length);
});
test('search retains the new umbrella and intermediate parent context',()=>{
 const nodes=specialtyPickerNodes({},'en','narcolepsy');assert.ok(find(nodes,'psychiatry'));
 const oncology=specialtyPickerNodes({},'en','cardio-oncology');assert.ok(find(oncology,'umbrella_oncology'));assert.ok(find(oncology,'cardio_oncology'));
});
