const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
function load(file,imports={},env={STRIPE_WEBHOOK_SECRET:'whsec_fictional_fixture'}) {
 const module={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports,require:name=>imports[name]||(name.startsWith('.')?load(path.resolve(path.dirname(file),name+'.ts'),imports,env):require(name)),process:{env},Request,Response,Buffer,URL,Date});
 return module.exports;
}
const request=body=>new Request('https://preview.example/api',{method:'POST',headers:{origin:'https://preview.example','content-type':'application/json'},body:JSON.stringify(body)});
const input={drugName:'Origin medicine',originCountry:'Italy',targetCountry:'United Kingdom',mode:'international',lang:'en'};
const matches={originProfile:{active_ingredients:[{name:'Example',strength:'5 mg'}]},equivalentResults:{raw_text:'1. Medicine A\n2. Medicine B\n3. Medicine C\n4. Medicine D\n5. Medicine E'}};
function meter(state={enabled:true,user:'member',allowed:true}) {
 const calls={reserve:0,finish:[],provider:0};
 const imports={'./config':{membershipPreviewEnabled:()=>state.enabled,sameOrigin:()=>true},'./auth':{membershipUser:async()=>state.user?{id:state.user}:null},'./store':{
  reserve:async()=>{calls.reserve++;return {allowed:state.allowed,reason:'MONTHLY_LIMIT'};},finish:async(user,id,success)=>calls.finish.push(success)}};
 return {...load('lib/membership/meter.ts',imports),calls,state};
}
test('compound search and all five follow-up leaflets use exactly one quota slot',async()=>{
 const m=meter();let leafletCalls=0;
 const leaflet=m.withMembership(async()=>{leafletCalls++;return Response.json({leaflet:{leaflet_text:'Fictional leaflet'}});},'leaflet');
 const matching=m.withMembership(async()=>Response.json(matches),'matches');
 const compound=async req=>{await leaflet(request(input));return matching(req);};
 const response=await m.meteredSearch(request(input),compound);
 const data=await response.json();assert.ok(data.searchAccess);assert.equal(m.calls.reserve,1);assert.deepEqual(m.calls.finish,[true]);
 m.state.allowed=false; // That primary search used the final free slot.
 for(const letter of ['A','B','C','D','E']) {
  const result=await leaflet(request({drugName:'Medicine '+letter,originCountry:'United Kingdom',searchAccess:data.searchAccess,lang:'en'}));assert.equal(result.status,200);
 }
 assert.equal(leafletCalls,6);assert.equal(m.calls.reserve,1);assert.deepEqual(m.calls.finish,[true]);
 assert.equal((await matching(request(input))).status,429);
});
test('follow-up permissions reject altered tokens, other accounts, countries, medicines and kinds',async()=>{
 const m=meter();const token=(await (await m.meteredSearch(request(input),async()=>Response.json(matches))).json()).searchAccess;
 let called=0;const leaflet=m.withMembership(async()=>{called++;return Response.json({});},'leaflet');
 const original={drugName:'Medicine A',originCountry:'United Kingdom',searchAccess:token};
 for(const change of [{drugName:'Unrelated medicine'},{originCountry:'France'},{searchAccess:token.slice(0,-5)+'xxxxx'}])assert.equal((await leaflet(request({...original,...change}))).status,403);
 const info=m.withMembership(async()=>{called++;return Response.json({});},'information');assert.equal((await info(request(original))).status,403);
 m.state.user='another-member';assert.equal((await leaflet(request(original))).status,403);
 m.state.user=null;assert.equal((await leaflet(request(original))).status,401);
 assert.equal(called,0);assert.equal(m.calls.reserve,1);
});
test('pet origin and returned product information share the completed search permission',()=>{
 const grants=load('lib/membership/search-grant.ts');const pet={...input,mode:'pets'};
 const token=grants.issueSearchGrant('owner',pet,matches);
 assert.equal(grants.allowsSearchFollowup(token,'owner','information',{drugName:input.drugName,originCountry:'Italy'}),true);
 assert.equal(grants.allowsSearchFollowup(token,'owner','information',{drugName:'Medicine E',originCountry:'United Kingdom'}),true);
 assert.equal(grants.allowsSearchFollowup(token,'owner','leaflet',{drugName:'Medicine E',originCountry:'United Kingdom'}),false);
 const generic=grants.issueSearchGrant('owner',{...input,mode:'generic'},matches);
 assert.equal(grants.allowsSearchFollowup(generic,'owner','leaflet',{drugName:'Medicine A',originCountry:'Italy'}),true);
});
test('successful standalone generated information counts, empty and failed responses release quota',async()=>{
 for(const [kind,body,status,charged] of [['leaflet',{leaflet:{leaflet_text:'Fictional content'}},200,true],['leaflet',{leaflet:{leaflet_text:'No leaflet generated.'}},200,false],['text',{response:'Educational result'},200,true],['information',{sections:[{bullets:['Fictional information']}]},200,true],['information',{sections:[{bullets:[]}]},200,false],['plain','Educational response',200,true],['text',{error:'failed'},500,false]]) {
  const m=meter();await m.meteredSearch(request({}),async()=>kind==='plain'?new Response(body):Response.json(body,{status}),kind);assert.deepEqual(m.calls.finish,[charged]);
 }
});
test('preview gates deny before generation; production bypasses the new billing system',async()=>{
 const m=meter({enabled:true,user:null,allowed:true});let invoked=0;const route=m.withMembership(async()=>{invoked++;return Response.json({response:'Original response'});},'text');
 assert.equal((await route(request({}))).status,401);assert.equal(invoked,0);assert.equal(m.calls.reserve,0);
 m.state.enabled=false;assert.equal((await route(request({}))).status,200);assert.equal(invoked,1);assert.equal(m.calls.reserve,0);
});
test('every normal generated-search endpoint has a server membership guard',()=>{
 for(const file of ['ai-search','triage','openai','openai/equivalent-search','openai/generics','openai/pets','openai/pet-generics','openai/leaflet','openai/veterinary-information']) {
  assert.match(fs.readFileSync('app/api/'+file+'/route.ts','utf8'),/export const POST=withMembership\(generate,/);
 }
});
test('account return accepts only local human and pet search pages',()=>{
 const client=load('app/lib/membership-client.ts');assert.equal(client.membershipReturnHref('/'),'/?resume=1');assert.equal(client.membershipReturnHref('/pets'),'/pets?resume=1');
 for(const url of ['https://attacker.example','//attacker.example','/admin',null])assert.equal(client.membershipReturnHref(url),null);
});
test('UX preflight recognises remaining trial or free quota without a subscription, including pending slots',async()=>{
 const baseline={premium:false,reserved:0,trialAvailable:true,trialUsed:0,trialReserved:0,trialLimit:5,used:0,freeReserved:0,limit:2};
 let status=baseline,user=true,enabled=true;
 const route=load('app/api/membership/access/route.ts',{
  '@/lib/membership/config':{membershipPreviewEnabled:()=>enabled,sameOrigin:()=>true},
  '@/lib/membership/auth':{membershipUser:async()=>user?{id:'owner'}:null},
  '@/lib/membership/store':{membershipStatus:async()=>status},
 });
 for(const change of [{},{trialAvailable:false},{trialUsed:5},{premium:true,trialUsed:5,used:2}]){status={...baseline,...change};assert.equal((await route.POST(request({}))).status,200);}
 for(const [change,reason] of [[{trialAvailable:false,used:2},'MONTHLY_LIMIT'],[{trialUsed:4,trialReserved:1},'TRIAL_REQUESTS_PENDING'],[{premium:true,reserved:3},'TOO_MANY_CONCURRENT_REQUESTS'],[{trialAvailable:false,used:1,freeReserved:1},'MONTHLY_LIMIT']]) {
  status={...baseline,...change};const response=await route.POST(request({}));assert.equal(response.status,429);assert.equal((await response.json()).error,reason);
 }
 user=false;assert.equal((await route.POST(request({}))).status,401);
 enabled=false;assert.equal((await (await route.POST(request({}))).json()).enabled,false);
});
test('direct matching handlers choose their own permission kind regardless of client mode',async()=>{
 const m=meter();const route=m.withMembership(async()=>Response.json(matches),'matches','pets');
 const token=(await (await route(request({...input,mode:'international'}))).json()).searchAccess;
 const grants=load('lib/membership/search-grant.ts');const child={drugName:'Medicine A',originCountry:'United Kingdom'};
 assert.equal(grants.allowsSearchFollowup(token,'member','information',child),true);
 assert.equal(grants.allowsSearchFollowup(token,'member','leaflet',child),false);
});
