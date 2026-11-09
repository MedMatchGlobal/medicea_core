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
