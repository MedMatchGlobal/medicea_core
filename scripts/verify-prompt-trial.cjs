/* Build-only fixed public-product trial. No customer identity, database or mail. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module'),ts=require('typescript');
if(process.argv[2]!=='--public-product-trial'||process.env.VERCEL_ENV!=='preview'||process.env.VERCEL_PROJECT_ID!=='prj_zIesaaTzLOzNm32TYoEfcv7DQklE')throw Error('PRIVATE_PREVIEW_TRIAL_REQUIRED');
const root=path.resolve(__dirname,'..'),cache=new Map();
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);const native=createRequire(file),local=name=>name==='@/lib/membership/meter'?{withMembership:fn=>fn}:name.startsWith('@/')?load(path.join(root,name.slice(2))+'.ts'):name.startsWith('.')?load(path.resolve(path.dirname(file),name)+'.ts'):native(name);vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{module,exports:module.exports,require:local,process,fetch,URL,URLSearchParams,Date,Intl,Buffer,Response,Request,Headers,AbortSignal,AbortController,setTimeout,clearTimeout,console});return module.exports;}
function check(value,code){if(!value)throw Object.assign(Error(code),{trialCode:code});}
let stage='origin_identification';
(async()=>{
 const transport=load(path.join(root,'app/lib/claude-preview.ts')),search=load(path.join(root,'app/lib/sonnet-research-matches.ts')).productionStrengthSearch;
 const actualResearch=transport.claudeResearch;
 transport.claudeResearch=async(...args)=>{
  const reply=await actualResearch(...args);
  if(Array.isArray(reply.products))console.log('MEDICEA_PUBLIC_ORIGIN_SHAPE '+JSON.stringify({variants_complete:reply.variants_complete,products:reply.products.map(p=>({name:p.name,country:p.country,form:p.form,route:p.route,release:p.release,complete:p.complete,generic:p.generic,species:p.species,ingredients:p.ingredients}))}));
  return reply;
 };
 const input={drugName:'Panadol Advance',drugDosage:'500 mg',originCountry:'United Kingdom',targetCountry:'Italy'};
 const started=Date.now();const trial=await transport.withClaudeEvaluation(async()=>{
  const choice=await search(input,true),body=await choice.json();check(choice.ok&&body.requiresChoice===true&&body.variants?.length>0,'CONFIRMABLE_ORIGIN_REQUIRED');
  const selected=body.variants.find(p=>p.ingredients?.length===1&&/^paracetamol$/i.test(p.ingredients[0].name)&&/^500(?:\.0+)?\s*mg(?:\s*(?:per|\/)\s*(?:1\s*)?tablet)?$/i.test(p.ingredients[0].strength)&&p.route==='oral'&&/tablet/i.test(p.form));
  check(selected,'PUBLIC_LABEL_IDENTITY_MISMATCH');stage='parallel_matches_and_leaflet';
  const events=[];
  const matchWork=search({...input,originSelection:selected.token},false,true).then(async response=>{const data=await response.json();events.push({kind:'matches',elapsedMs:Date.now()-started,status:response.status});return {response,data};});
  const identity=load(path.join(root,'app/lib/leaflet-identity.ts')).leafletIdentity(selected,selected.name,input.originCountry);
  const leafletWork=load(path.join(root,'app/api/openai/leaflet/route.ts')).POST(new Request('https://private-build.invalid/api/openai/leaflet',{method:'POST',body:JSON.stringify({drugName:selected.name,originCountry:input.originCountry,drugDosage:input.drugDosage,lang:'en',selectedProduct:identity})})).then(async response=>{const data=await response.json();events.push({kind:'leaflet',elapsedMs:Date.now()-started,status:response.status});return {response,data};});
  const [matches,leaflet]=await Promise.all([matchWork,leafletWork]);
  check(matches.response.ok,'MATCHING_TRIAL_UNAVAILABLE');check(leaflet.response.ok&&leaflet.data.leaflet?.leaflet_text,'LEAFLET_TRIAL_UNAVAILABLE');
  const view=load(path.join(root,'app/lib/readable-leaflet.ts')).parseReadableLeaflet(leaflet.data.leaflet.leaflet_text,selected);
  check(view.sources.length>0,'LEAFLET_SOURCES_REQUIRED');check(!/https?:\/\//.test(JSON.stringify(view.sections)),'INLINE_LINKS_MUST_BE_GROUPED');
  check(view.sections.some(s=>s.key==='Warnings')&&view.sections.some(s=>s.key==='Side Effects'),'CLEAR_SAFETY_HEADINGS_REQUIRED');
  check(Array.isArray(matches.data.matches),'STRUCTURED_MATCHES_REQUIRED');
  return {publicInput:input,origin:{name:selected.name,form:selected.form,route:selected.route,release:selected.release,ingredients:selected.ingredients,sources:selected.sources},choiceCount:body.variants.length,explicitConfirmation:true,events,matchCount:matches.data.matches.length,candidates:matches.data.matches.map(m=>({name:m.medicine_name,ingredients:m.ingredients,form:m.form,route:m.route,release:m.release,excipientStatus:m.excipientComparison?.status,sources:m.sources})),leaflet:{headings:view.sections.map(s=>s.key),sourceCount:view.sources.length,sources:view.sources,price:view.price,inlineLinks:0,text:leaflet.data.leaflet.leaflet_text},diagnostic:matches.data.equivalentDebug?.decisions?.map(d=>({name:d.profile?.name,accepted:d.accepted,reasons:d.reasons}))};
 });
 console.log('MEDICEA_PROMPT_TRIAL '+JSON.stringify({passed:true,...trial.value,elapsedMs:Date.now()-started,providerCalls:trial.calls.map(c=>({model:c.model,ms:c.ms,usage:c.usage})),scope:'Actual public-product model calls and renderer; not signed-in HTTP/browser, clinical sign-off, stock availability or regulatory substitutability acceptance',databaseWrites:0,emailsSent:0}));
})().catch(error=>{console.error('MEDICEA_PROMPT_TRIAL_FAILED '+JSON.stringify({stage,code:error.trialCode||'TRIAL_UNAVAILABLE'}));process.exitCode=1;});
