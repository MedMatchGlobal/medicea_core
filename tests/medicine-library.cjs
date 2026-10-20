const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
function load(file){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{module,exports:module.exports,process:{env:{}},Intl,Date});return module.exports;}
const lib=load('app/lib/travel-demo.ts'),copy=load('app/i18n/medicine-library.ts'),oldCopy=load('app/i18n/travel-demo.ts');
const trip={id:'old-demo',home:'GB',destination:'IT',start:'2026-11-01',end:'2026-11-07',medicines:['A','B'],checks:['supply'],savedAt:'2026-10-16T09:00:00Z'};
test('existing trip fixtures seed the library once without rewriting trips or restoring explicitly removed medicines',()=>{const state=lib.readTravelDemo(JSON.stringify({version:1,home:'GB',trips:[trip,{...trip,id:'other'}]}));assert.equal(state.trips.length,2);assert.equal(state.library.length,2);assert.equal(state.library[0].origin,'GB');assert.equal(state.trips[0].checks[0],'supply');assert.equal(state.homeConfirmed,false);const empty=lib.readTravelDemo(JSON.stringify({...state,library:[]}));assert.equal(empty.library.length,0);assert.equal(empty.trips.length,2);});
test('library storage strips patient data, arbitrary medicines, coordinates and invalid comparisons',()=>{const comparison={medicine:'A',origin:'GB',destination:'IT',checkedAt:'2026-10-16T09:00:00Z'};const state=lib.readTravelDemo(JSON.stringify({version:1,home:'IT',homeConfirmed:true,otherCountry:'FR',trips:[trip],library:[{id:'A',origin:'GB',patient:'secret'},{id:'A',origin:'IT'},{id:'Real medicine',origin:'GB'},{id:'B',origin:'unsafe'}],comparisons:[{...comparison,patient:'secret'},comparison,{...comparison,origin:'IT'},{...comparison,medicine:'B'},{...comparison,checkedAt:'bad'}],latitude:51.5}));assert.equal(state.library.length,1);assert.equal(state.comparisons.length,1);assert.equal(state.home,'IT');assert.equal(state.homeConfirmed,true);assert.equal(state.otherCountry,'FR');assert.doesNotMatch(JSON.stringify(state),/secret|patient|latitude|Real medicine|unsafe/);});
test('saved comparisons are keyed by medicine, origin and destination, and cannot attach to a different formulation fixture',()=>{const state={...lib.readTravelDemo(null),library:[{id:'A',origin:'GB'}]};const first={medicine:'A',origin:'GB',destination:'IT',checkedAt:'2026-10-16T09:00:00Z'};const saved=lib.saveDemoComparisons(state,[first]);const newer=lib.saveDemoComparisons(saved,[{...first,checkedAt:'2026-10-17T09:00:00Z'}]);assert.equal(newer.comparisons.length,1);assert.match(newer.comparisons[0].checkedAt,/17/);assert.equal(lib.saveDemoComparisons(state,[{...first,origin:'IT'}]).comparisons.length,0);});
test('device region is only suggested from an explicit supported region and never inferred from language alone',()=>{assert.equal(lib.suggestHomeRegion(['it-IT']),'IT');assert.equal(lib.suggestHomeRegion(['it','en-GB']),'GB');for(const locales of [['it'],['en'],['en-NZ'],['zh-Hans-CN'],[]])assert.equal(lib.suggestHomeRegion(locales),'');});
test('pack snapshots retain original countries and dated comparisons after the library changes',()=>{const comparison={medicine:'A',origin:'IT',destination:'GB',checkedAt:'2026-10-16T09:00:00Z'};const pack={...trip,destination:'GB',origins:{A:'IT',B:'GB'},comparisons:[comparison]};const stored=lib.readTravelDemo(JSON.stringify({version:1,home:'GB',trips:[pack],library:[{id:'A',origin:'GB'}],comparisons:[]}));assert.equal(stored.trips[0].origins.A,'IT');assert.equal(stored.trips[0].comparisons[0].checkedAt,comparison.checkedAt);const n=copy.libraryCopy('en'),c={...oldCopy.travelCopy('en'),originCountryLabel:n.origin,notComparedLabel:n.notCompared,sourceLabel:n.source,checkedLabel:n.checked};const html=lib.offlineTripHtml(stored.trips[0],'en',c);assert.match(html,/Country of origin/);assert.match(html,/Italy/);assert.match(html,/2026-10-16/);assert.match(html,/No saved comparison/);assert.match(html,/fictional demonstration/);assert.doesNotMatch(html,/<script|src=|https?:\/\//);});
test('all 25 languages cover the medicine-first flow and distinct news country controls',()=>{assert.equal(Object.keys(copy.LIBRARY_TRANSLATIONS).length,25);for(const [lang,values] of Object.entries(copy.LIBRARY_TRANSLATIONS)){assert.equal(values.length,copy.LIBRARY_KEYS.length,lang);for(const value of Object.values(copy.libraryCopy(lang)))assert.ok(value.trim(),lang);}});
const reviewCopy=load('app/i18n/comparison-review.ts');
test('annual reviews use a calendar year, clamp leap days, and become due on the review date',()=>{
 assert.equal(lib.comparisonReviewDate('2024-02-29T23:30:00Z'),'2025-02-28');
 assert.equal(lib.comparisonReviewDate('2025-10-16T23:30:00Z'),'2026-10-16');
 assert.equal(lib.comparisonReviewDue('2025-10-16T23:30:00Z',new Date('2026-10-15T23:59:59Z')),false);
 assert.equal(lib.comparisonReviewDue('2025-10-16T23:30:00Z',new Date('2026-10-16T00:00:00Z')),true);
 assert.equal(lib.comparisonReviewDue('bad'),true);
});
test('demo refresh preserves previous fixture results by country and leaves existing packs unchanged',()=>{
 const first={medicine:'A',origin:'GB',destination:'IT',checkedAt:'2025-10-16T09:00:00Z'};
 const other={...first,destination:'GB'};
 const state={...lib.readTravelDemo(null),library:[{id:'A',origin:'GB'}],comparisons:[first,other],trips:[{...trip,origins:{A:'GB',B:'GB'},comparisons:[first]}]};
 const refreshed=lib.saveDemoComparisons(state,[{...first,checkedAt:'2026-10-16T09:00:00Z'}]);
 assert.equal(refreshed.comparisons.length,2);
 assert.equal(refreshed.comparisons[0].previousChecks[0],first.checkedAt);
 assert.equal(refreshed.comparisons[1].checkedAt,other.checkedAt);
 assert.equal(refreshed.trips[0].comparisons[0].checkedAt,first.checkedAt);
 const loaded=lib.readTravelDemo(JSON.stringify(refreshed));
 assert.equal(loaded.comparisons[0].previousChecks[0],first.checkedAt);
 const replay=lib.saveDemoComparisons(loaded,[first]);
 assert.equal(replay.comparisons[0].checkedAt,'2026-10-16T09:00:00Z');
});
test('comparison history accepts only prior date strings and is bounded without storing arbitrary source or health data',()=>{
 const comparison={medicine:'A',origin:'GB',destination:'IT',checkedAt:'2026-10-16T09:00:00Z',previousChecks:['2025-01-01T00:00:00Z','2025-01-01T00:00:00Z','patient info',{},'2027-01-01T00:00:00Z']};
 const state=lib.readTravelDemo(JSON.stringify({version:1,library:[{id:'A',origin:'GB'}],comparisons:[comparison]}));
 assert.equal(state.comparisons[0].previousChecks.length,1);
 assert.equal(state.comparisons[0].previousChecks[0],'2025-01-01T00:00:00Z');
 assert.doesNotMatch(JSON.stringify(state),/patient info|2027/);
 const many=lib.readTravelDemo(JSON.stringify({...state,comparisons:[{...comparison,previousChecks:Array.from({length:40},(_,i)=>new Date(Date.UTC(2025,0,i+1)).toISOString())}]}));
 assert.equal(many.comparisons[0].previousChecks.length,24);
});
test('annual review and demo refresh disclosures cover all 25 interface languages',()=>{
 assert.equal(Object.keys(reviewCopy.REVIEW_TRANSLATIONS).length,25);
 for(const [lang,values] of Object.entries(reviewCopy.REVIEW_TRANSLATIONS)){
  assert.equal(values.length,reviewCopy.REVIEW_KEYS.length,lang);
  for(const value of Object.values(reviewCopy.reviewCopy(lang)))assert.ok(value.trim(),lang);
 }
 assert.match(reviewCopy.reviewCopy('en').unchanged,/No live source/);
});


test('expanded demo countries retain independent comparisons and packs across reload',()=>{
 assert.equal(lib.DEMO_COUNTRIES.length,8);
 const state={...lib.readTravelDemo(null),home:'FR',homeConfirmed:true,library:[{id:'A',origin:'ES'}]};
 const items=lib.DEMO_COUNTRIES.map(destination=>({medicine:'A',origin:'ES',destination,checkedAt:'2026-10-16T09:00:00Z'}));
 const saved=lib.saveDemoComparisons(state,items);
 const stored=lib.readTravelDemo(JSON.stringify({...saved,trips:[{...trip,home:'FR',destination:'AU',medicines:['A'],origins:{A:'ES'},comparisons:items.filter(c=>c.destination==='AU')}]}));
 assert.equal(stored.comparisons.length,8);assert.equal(stored.home,'FR');assert.equal(stored.library[0].origin,'ES');
 assert.equal(stored.trips[0].destination,'AU');assert.equal(stored.trips[0].comparisons[0].destination,'AU');
 for(const code of lib.DEMO_COUNTRIES)assert.equal(lib.suggestHomeRegion(['en-'+code]),code);
 assert.equal(lib.suggestHomeRegion(['fr']),'');
});
const destinationsCopy=load('app/i18n/destination-packs.ts');
test('destination packs have no journey dates and reuse only selected matching saved comparisons',()=>{
 const comparison={medicine:'A',origin:'GB',destination:'FR',checkedAt:'2026-10-16T09:00:00Z'};
 const state={...lib.readTravelDemo(null),library:[{id:'A',origin:'GB'},{id:'B',origin:'IT'}],comparisons:[comparison,{...comparison,medicine:'B',origin:'IT'},{...comparison,destination:'ES'}]};
 const pack=lib.makeDestinationPack(state,'fr-pack','FR',['A']);assert.equal(lib.validDestinationPack(pack),true);assert.equal(lib.validTrip(pack),false);assert.equal(pack.medicines.length,1);assert.equal(pack.comparisons.length,1);assert.equal(pack.comparisons[0].destination,'FR');assert.equal('start' in pack,false);
 const html=lib.offlineTripHtml(pack,'en',oldCopy.travelCopy('en'));assert.doesNotMatch(html,/undefined|2000-01-01|<section class="checklist">/);assert.match(html,/France/);
 assert.throws(()=>lib.makeDestinationPack(state,'empty','FR',[]));
 assert.equal(lib.validDestinationPack({...pack,start:'bad',end:'bad'}),false);
});
test('prepared journeys are independent dated snapshots and checklist state is per journey',()=>{
 const state={...lib.readTravelDemo(null),library:[{id:'A',origin:'GB'}],comparisons:[{medicine:'A',origin:'GB',destination:'FR',checkedAt:'2026-10-16T09:00:00Z'}]};
 const pack=lib.makeDestinationPack(state,'fr-pack','FR',['A']);
 const first=lib.prepareDestinationTrip(pack,'trip-1','2026-11-01','2026-11-03','Demo hotel');
 const second=lib.prepareDestinationTrip(pack,'trip-2','2026-12-01','2026-12-03','Demo station');
 first.checks.push('supply');first.comparisons[0].checkedAt='2026-10-17T00:00:00Z';
 assert.equal(pack.comparisons[0].checkedAt,'2026-10-16T09:00:00Z');assert.equal(second.comparisons[0].checkedAt,'2026-10-16T09:00:00Z');assert.equal(second.checks.length,0);assert.equal(first.packId,'fr-pack');
 assert.throws(()=>lib.prepareDestinationTrip(pack,'bad','2026-02-30','2026-03-01',''));
});
test('legacy journeys seed one destination pack per country once without replacing or reviving deleted packs',()=>{
 const loaded=lib.readTravelDemo(JSON.stringify({version:1,trips:[trip,{...trip,id:'later'}]}));assert.equal(loaded.packs.length,1);assert.equal(loaded.trips.length,2);assert.equal(loaded.trips[0].checks[0],'supply');
 const cleared=lib.readTravelDemo(JSON.stringify({...loaded,packs:[]}));assert.equal(cleared.packs.length,0);assert.equal(cleared.trips.length,2);
});
test('destination packs and stay addresses survive reload with strict fixture fields and bounded text',()=>{
 const state={...lib.readTravelDemo(null),library:[{id:'A',origin:'GB'}]};const pack=lib.makeDestinationPack(state,'fr-pack','FR',['A']);
 const journey=lib.prepareDestinationTrip(pack,'trip-1','2026-11-01','2026-11-03','Demo\nstation'+ 'x'.repeat(300));
 const loaded=lib.readTravelDemo(JSON.stringify({...state,packs:[{...pack,patient:'private',address:'private'}],trips:[{...journey,patient:'private'}]}));
 assert.equal(loaded.packs.length,1);assert.equal(loaded.trips[0].packId,'fr-pack');assert.equal(loaded.trips[0].address.length,240);assert.doesNotMatch(loaded.trips[0].address,/\n/);assert.doesNotMatch(JSON.stringify(loaded),/private|patient/);
});
test('nearby care links encode an address and country only on a fixed Maps host',()=>{
 for(const kind of ['pharmacy','gp','hospital']){const url=new URL(lib.nearbyCareUrl(kind,'Demo square & query=bad # <x>','FR'));assert.equal(url.origin,'https://www.google.com');assert.equal(url.pathname,'/maps/search/');assert.equal(url.searchParams.get('api'),'1');assert.match(url.searchParams.get('query'),/Demo square & query=bad # <x>, France$/);assert.equal([...url.searchParams].length,2);}
 assert.equal(lib.nearbyCareUrl('gp','','FR'),'');assert.equal(lib.nearbyCareUrl('gp','Demo','ZZ'),'');
});
test('downloaded journey escapes stay addresses and contains no remote contact lookup or scripts',()=>{
 const pack=lib.makeDestinationPack({...lib.readTravelDemo(null),library:[{id:'A',origin:'GB'}]},'fr-pack','FR',['A']);const journey=lib.prepareDestinationTrip(pack,'trip-1','2026-11-01','2026-11-03','<script>alert(1)</script>');
 const html=lib.offlineTripHtml(journey,'en',{...oldCopy.travelCopy('en'),addressLabel:'Stay address',careNote:'Not verified contacts'});assert.match(html,/Stay address/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script|https?:\/\//);assert.match(html,/Not verified contacts/);
});
test('destination and nearby-care labels are complete in all 25 languages',()=>{
 assert.equal(Object.keys(destinationsCopy.DESTINATION_TRANSLATIONS).length,25);for(const [lang,values] of Object.entries(destinationsCopy.DESTINATION_TRANSLATIONS)){assert.equal(values.length,destinationsCopy.DESTINATION_KEYS.length,lang);for(const value of Object.values(destinationsCopy.destinationCopy(lang)))assert.ok(value.trim(),lang);}
});
const emergencyText=load('app/i18n/travel-emergency.ts');
test('emergency numbers are destination-based and consular lookup is independently keyed to passport country',()=>{
 for(const code of ['IT','FR','ES','DE','PT'])assert.equal(lib.EMERGENCY_CONTACTS[code].number,'112');assert.equal(lib.EMERGENCY_CONTACTS.GB.number,'999');assert.equal(lib.EMERGENCY_CONTACTS.US.number,'911');assert.equal(lib.EMERGENCY_CONTACTS.AU.number,'000');
 for(const code of lib.DEMO_COUNTRIES){assert.match(lib.EMERGENCY_CONTACTS[code].source,/^https:\/\//);assert.match(lib.CONSULAR_DIRECTORIES[code],/^https:\/\//);}
 const url=new URL(lib.embassySearchUrl('IT','Demo hotel & query=bad','FR'));assert.equal(url.origin,'https://www.google.com');assert.equal([...url.searchParams].length,2);assert.match(url.searchParams.get('query'),/embassy or consulate of Italy near Demo hotel & query=bad, France/);assert.equal(lib.embassySearchUrl('FR','Demo','FR'),'');const countrySearch=new URL(lib.embassySearchUrl('IT','','FR'));assert.equal(countrySearch.searchParams.get('query'),'embassy or consulate of Italy in France');const blankSearch=new URL(lib.embassySearchUrl('IT','  \n ','FR'));assert.equal(blankSearch.searchParams.get('query'),'embassy or consulate of Italy in France');
});
test('manual consular contacts are bounded, sanitised, preserved in journeys and escaped in offline files',()=>{
 const contact={passport:'IT',name:'Demo <office>',phone:'+39 000 000 000',address:'Demo <street>',savedAt:'2026-10-16T09:00:00Z',patient:'private',url:'javascript:alert(1)'};
 const state=lib.readTravelDemo(JSON.stringify({version:1,trips:[{...trip,destination:'FR',address:'Demo Paris',consular:contact}]}));assert.equal(state.trips[0].consular.passport,'IT');assert.doesNotMatch(JSON.stringify(state),/private|javascript|patient/);
 const html=lib.offlineTripHtml(state.trips[0],'en',{...oldCopy.travelCopy('en'),contactNote:'Saved by you'});assert.match(html,/112/);assert.match(html,/Demo &lt;office&gt;/);assert.match(html,/\+39 000 000 000/);assert.match(html,/Saved by you/);assert.doesNotMatch(html,/<script|https?:\/\//);
 assert.equal(lib.cleanConsularContact({...contact,phone:'javascript:bad'}),null);assert.equal(lib.cleanConsularContact({...contact,passport:'ZZ'}),null);
});
test('all 25 languages disclose emergency and user-entered consular contact status',()=>{
 assert.equal(Object.keys(emergencyText.EMERGENCY_TRANSLATIONS).length,25);for(const [lang,values] of Object.entries(emergencyText.EMERGENCY_TRANSLATIONS)){assert.equal(values.length,emergencyText.EMERGENCY_KEYS.length,lang);for(const value of Object.values(emergencyText.emergencyCopy(lang)))assert.ok(value.trim(),lang);}
});

const staysText=load('app/i18n/travel-stays.ts');
test('multiple stays survive reload, sort by date, exclude unrelated fields and export safely',()=>{
 const pack=lib.makeDestinationPack({...lib.readTravelDemo(null),library:[{id:'A',origin:'GB'}]},'de-pack','DE',['A']);
 const stays=[{address:'Demo <Berlin>',start:'2026-11-03',end:'2026-11-07',latitude:12},{address:'Demo Mainz',start:'2026-11-01',end:'2026-11-03',secret:'private'}];
 const journey=lib.prepareDestinationTrip(pack,'multi','2026-11-01','2026-11-07','',new Date('2026-10-16'),stays);
 const state=lib.readTravelDemo(JSON.stringify({version:1,trips:[{...journey,checks:['supply']}]}));
 assert.equal(state.trips[0].stays.length,2);assert.equal(state.trips[0].stays[0].address,'Demo Mainz');assert.equal(state.trips[0].checks[0],'supply');assert.doesNotMatch(JSON.stringify(state),/latitude|secret|private/);
 const html=lib.offlineTripHtml(state.trips[0],'en',{...oldCopy.travelCopy('en'),staysLabel:'Stays'});assert.match(html,/Demo Mainz/);assert.match(html,/Demo &lt;Berlin&gt;/);assert.match(html,/2026-11-03/);assert.doesNotMatch(html,/<script|https?:/);
 assert.equal(lib.tripStays({...trip,address:'Legacy hotel'})[0].address,'Legacy hotel');
});
test('stay validation rejects overlap, outside-trip dates, impossible dates, blanks and excessive entries',()=>{
 const a={address:'Demo A',start:'2026-11-01',end:'2026-11-04'},b={address:'Demo B',start:'2026-11-04',end:'2026-11-07'};
 assert.equal(lib.cleanTripStays([a,b],trip.start,trip.end).length,2);
 for(const stays of [[a,{...b,start:'2026-11-03'}],[{...a,start:'2026-10-31'}],[{...b,end:'2026-11-08'}],[{...a,start:'2026-02-30'}],[{...a,address:'  '}],Array(11).fill(a)])assert.equal(lib.cleanTripStays(stays,trip.start,trip.end),null);
 assert.equal(lib.cleanTripStays([],trip.start,trip.end).length,0);
});
test('stay controls and Save trip are translated for all 25 languages',()=>{
 assert.equal(Object.keys(staysText.STAY_TRANSLATIONS).length,25);for(const [lang,values] of Object.entries(staysText.STAY_TRANSLATIONS)){assert.equal(values.length,staysText.STAY_KEYS.length);for(const text of values)assert.ok(text.trim(),lang);}
 assert.equal(destinationsCopy.destinationCopy('en').saveTrip,'Save trip');
});
