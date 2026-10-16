const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
function load(file){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{module,exports:module.exports,process:{env:{}},Intl,Date});return module.exports;}
const lib=load('app/lib/travel-demo.ts'),copy=load('app/i18n/medicine-library.ts'),oldCopy=load('app/i18n/travel-demo.ts');
const trip={id:'old-demo',home:'GB',destination:'IT',start:'2026-11-01',end:'2026-11-07',medicines:['A','B'],checks:['supply'],savedAt:'2026-10-16T09:00:00Z'};
test('existing trip fixtures seed the library once without rewriting trips or restoring explicitly removed medicines',()=>{const state=lib.readTravelDemo(JSON.stringify({version:1,home:'GB',trips:[trip,{...trip,id:'other'}]}));assert.equal(state.trips.length,2);assert.equal(state.library.length,2);assert.equal(state.library[0].origin,'GB');assert.equal(state.trips[0].checks[0],'supply');assert.equal(state.homeConfirmed,false);const empty=lib.readTravelDemo(JSON.stringify({...state,library:[]}));assert.equal(empty.library.length,0);assert.equal(empty.trips.length,2);});
test('library storage strips patient data, arbitrary medicines, coordinates and invalid comparisons',()=>{const comparison={medicine:'A',origin:'GB',destination:'IT',checkedAt:'2026-10-16T09:00:00Z'};const state=lib.readTravelDemo(JSON.stringify({version:1,home:'IT',homeConfirmed:true,otherCountry:'FR',trips:[trip],library:[{id:'A',origin:'GB',patient:'secret'},{id:'A',origin:'IT'},{id:'Real medicine',origin:'GB'},{id:'B',origin:'unsafe'}],comparisons:[{...comparison,patient:'secret'},comparison,{...comparison,origin:'IT'},{...comparison,medicine:'B'},{...comparison,checkedAt:'bad'}],latitude:51.5}));assert.equal(state.library.length,1);assert.equal(state.comparisons.length,1);assert.equal(state.home,'IT');assert.equal(state.homeConfirmed,true);assert.equal(state.otherCountry,'FR');assert.doesNotMatch(JSON.stringify(state),/secret|patient|latitude|Real medicine|unsafe/);});
test('saved comparisons are keyed by medicine, origin and destination, and cannot attach to a different formulation fixture',()=>{const state={...lib.readTravelDemo(null),library:[{id:'A',origin:'GB'}]};const first={medicine:'A',origin:'GB',destination:'IT',checkedAt:'2026-10-16T09:00:00Z'};const saved=lib.saveDemoComparisons(state,[first]);const newer=lib.saveDemoComparisons(saved,[{...first,checkedAt:'2026-10-17T09:00:00Z'}]);assert.equal(newer.comparisons.length,1);assert.match(newer.comparisons[0].checkedAt,/17/);assert.equal(lib.saveDemoComparisons(state,[{...first,origin:'IT'}]).comparisons.length,0);});
test('device region is only suggested from an explicit supported region and never inferred from language alone',()=>{assert.equal(lib.suggestHomeRegion(['it-IT']),'IT');assert.equal(lib.suggestHomeRegion(['it','en-GB']),'GB');for(const locales of [['it'],['en'],['en-US'],['zh-Hans-CN'],[]])assert.equal(lib.suggestHomeRegion(locales),'');});
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
