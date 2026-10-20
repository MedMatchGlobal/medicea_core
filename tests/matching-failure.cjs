const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
function load(file){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{module,exports:module.exports});return module.exports;}
test('refusals and no-match sentinels cannot become medicine cards',()=>{
 const {isMedicineName,isEmptyMatchText}=load('app/lib/match-display.ts');
 for(const text of ["I'm sorry, but I cannot provide a list of products with that specific combination of ingredients",'I cannot provide that list','No results.','No matches.','Not found'])assert.equal(isMedicineName(text),false,text);
 for(const text of ['Solpadeine Max','No-Spa 40 mg','Co-Efferalgan 500 mg + 30 mg'])assert.equal(isMedicineName(text),true,text);
 assert.equal(isEmptyMatchText('No matches.'),true);assert.equal(isEmptyMatchText('No exact match found'),true);assert.equal(isEmptyMatchText("I'm sorry, but I cannot provide a list"),false);assert.equal(isEmptyMatchText('No-Spa'),false);
});
test('normal empty-result copy covers all 25 languages',()=>{
 const {emptyMatchCopy}=load('app/i18n/empty-match.ts');for(const lang of ['en','af','ar','cs','da','de','el','es','fi','fr','he','hi','hu','it','ja','ko','nl','no','pl','pt','ro','ru','sv','tr','zh']){const copy=emptyMatchCopy(lang);assert.ok(copy.title&&copy.body);if(lang!=='en')assert.notEqual(copy.title,emptyMatchCopy('en').title,lang);}
});
test('unconfirmed origins and service failures are different; only allowlisted codes request clarification',()=>{
 const {matchingFailure}=load('app/lib/matching-failure.ts');assert.equal(matchingFailure(422,'NOT_FOUND_ORIGIN').kind,'unconfirmed');assert.equal(matchingFailure(422,'ORIGIN_STRENGTH_MISMATCH').kind,'unconfirmed');assert.equal(matchingFailure(503,'NOT_FOUND_ORIGIN').kind,'failed');assert.equal(matchingFailure(504,null).kind,'failed');assert.equal(matchingFailure(422,'<script>').kind,'failed');
});
test('matching feedback covers every supported language without falling back to English',()=>{
 const {matchingFeedback}=load('app/i18n/matching-feedback.ts');const languages=['en','af','ar','cs','da','de','el','es','fi','fr','he','hi','hu','it','ja','ko','nl','no','pl','pt','ro','ru','sv','tr','zh'];for(const lang of languages){const copy=matchingFeedback(lang);for(const value of Object.values(copy))assert.ok(typeof value==='string'&&value.trim());if(lang!=='en')assert.notEqual(copy.incomplete,matchingFeedback('en').incomplete,lang);}
});
test('leaflet headings do not split Contraindications or manufacturer mentions inside prose',()=>{
 const {leafletSections}=load('app/lib/leaflet-sections.ts');const parts=leafletSections('Note\n- Check the manufacturer/regulator leaflet.\n\nContraindications\n- Fixture warning.\n\nActive Ingredients:\n- Fixture ingredient.');assert.equal(parts.length,3);assert.equal(parts[0].key,'Note');assert.match(parts[0].text,/manufacturer\/regulator/);assert.equal(parts[1].key,'Contraindications');assert.equal(parts[2].key,'Active Ingredients');assert.equal(leafletSections('Unstructured educational text.').length,0);assert.equal(leafletSections('**Uses:**\n- Fixture.')[0].key,'Uses');
});

test('explained and formatted no-match responses are messages rather than medicine identities',()=>{
 const {isMedicineName,isEmptyMatchText}=load('app/lib/match-display.ts');
 for(const text of ['No verified matches found. Availability in Italy of tablets containing codeine phosphate 8 mg plus paracetamol 500 mg per tablet could not be established from the retrieved evidence','**No verified matches found.**&#xA0;Availability could not be established.','No confirmed exact equivalents found: insufficient evidence.']){assert.equal(isMedicineName(text),false);assert.equal(isEmptyMatchText(text),true);}
 for(const text of ['No-Spa 40 mg','Co-Codamol 30 mg/500 mg Effervescent Tablets (Cipla)','Novalgin 500 mg'])assert.equal(isMedicineName(text),true);
});
test('equivalent titles keep product identity and move pack and authorisation commentary to details without hiding uncertainty',()=>{
 const {equivalentPresentation}=load('app/lib/match-display.ts');
 const raw='**Co-Efferalgan 500 mg + 30 mg compresse effervescenti**&#xA0;— 16 effervescent tablets; AIC 027989019. Italian authorisation confirmed in September 2026. Contains paracetamol 500 mg and codeine phosphate 30 mg per tablet; hemihydrate form and current pharmacy stock not confirmed';
 const p=equivalentPresentation(raw);assert.equal(p.title,'Co-Efferalgan 500 mg + 30 mg compresse effervescenti');assert.match(p.details,/AIC 027989019/);assert.equal(p.uncertainty,'hemihydrate form and current pharmacy stock not confirmed');assert.doesNotMatch(p.title,/AIC|authorisation|&#|\*\*/);assert.match(raw,/&#xA0;/);
 const simple=equivalentPresentation('Co-Codamol 30/500 tablets');assert.equal(simple.title,'Co-Codamol 30/500 tablets');assert.equal(simple.details,'');assert.equal(simple.uncertainty,'');
 const brand=equivalentPresentation('Co-Codamol 30/500 tablets (Accord-UK) – 32 tablets.');assert.equal(brand.title,'Co-Codamol 30/500 tablets (Accord-UK)');assert.equal(brand.details,'32 tablets.');
});

test('equivalent headings preserve the two explicitly researched suppliers without merging their identities',()=>{
 const {equivalentPresentation,equivalentLeafletName}=load('app/lib/match-display.ts');
 const first='Co-codamol 30/500 Effervescent Tablets — Zentiva, United Kingdom. Each effervescent tablet contains paracetamol 500 mg and codeine phosphate hemihydrate 30 mg. Prescription-only medicine';
 const second='Co-codamol 30 mg/500 mg effervescent tablets — Cipla EU Ltd, United Kingdom. Each effervescent tablet contains paracetamol 500 mg and codeine phosphate hemihydrate 30 mg. Prescription-only medicine';
 assert.equal(equivalentPresentation(first,'United Kingdom').title,'Co-codamol 30/500 Effervescent Tablets — Zentiva');assert.equal(equivalentPresentation(second,'United Kingdom').title,'Co-codamol 30 mg/500 mg effervescent tablets — Cipla EU Ltd');assert.notEqual(equivalentLeafletName(first,first,'United Kingdom'),equivalentLeafletName(second,second,'United Kingdom'));
 assert.match(equivalentPresentation(first,'United Kingdom').details,/Prescription-only/);
 assert.equal(equivalentPresentation('Co-codamol 30/500 tablets (Zentiva) — Zentiva, United Kingdom. More information.','United Kingdom').title,'Co-codamol 30/500 tablets (Zentiva)');
 assert.equal(equivalentPresentation('Co-codamol 30/500 tablets — 32 tablets, United Kingdom. More information.','United Kingdom').title,'Co-codamol 30/500 tablets');
 assert.equal(equivalentLeafletName(first,'different original result','United Kingdom'),first);
});

test('search summaries are never medicine identities while real products remain intact',()=>{
 const {isMedicineName,isSearchSummary}=load('app/lib/match-display.ts');
 for(const text of ['Only two matching products were confirmed from the retrieved UK product information; pharmacy stock availability was not verified','**Only 2 matching medicines were confirmed.**','Note: These products require a prescription.','Both products are prescription-only.']){assert.equal(isSearchSummary(text),true);assert.equal(isMedicineName(text),false);}
 for(const text of ['Co-codamol 30/500 Effervescent Tablets — Zentiva','Co-codamol 30 mg/500 mg effervescent tablets — Cipla EU Ltd','Allopurinol 100 mg tablets'])assert.equal(isMedicineName(text),true);
});
