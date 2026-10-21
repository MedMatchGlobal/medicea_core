// Fixed public medicine examples through this Preview's handlers.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.join(__dirname,'..'),env={...process.env,VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feature/production-prompts-new-ui',MEDICEA_OPENAI_UPGRADE:'true',MEDICEA_TRAVEL_CONNECTED:'true'};
function harness(observe){const cache={},calls=[];function load(file){file=file.replace(/\\/g,'/');if(cache[file])return cache[file];const absolute=path.join(root,file),module={exports:{}};cache[file]=module.exports;
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(absolute,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,{module,exports:module.exports,process:{env},Error,SyntaxError,Buffer,URL,Request,Response,Headers,AbortController,setTimeout,clearTimeout,console:{log(){},warn(){},error(){}},fetch:async(url,init)=>{const body=JSON.parse(init.body),start=Date.now(),call={requestedModel:body.model,ms:null,status:null,returnedModel:null};calls.push(call);const response=await fetch(url,init);call.ms=Date.now()-start;call.status=response.status;if(response.ok){const payload=await response.clone().json();call.returnedModel=payload.model;if(observe)observe(body,payload);}return response;},require(name){if(name==='next/server')return {NextResponse:{json:Response.json}};if(name==='@/lib/membership/meter')return {withMembership:h=>h};if(name.startsWith('@/'))return load(name.slice(2)+'.ts');if(name.startsWith('.'))return load(path.relative(root,path.resolve(path.dirname(absolute),name))+'.ts');return require(name);}});return cache[file]=module.exports;}return {load,calls};}
const request=body=>new Request('https://public-fixture.invalid/test',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/x-ndjson'},body:JSON.stringify(body)});
module.exports={harness,request};
if(require.main===module)(async()=>{
 for(const task of [{drugName:'Co-codamol',originCountry:'United Kingdom',targetCountry:'Italy',lang:'en'},{drugName:'Co Efferalgan',originCountry:'Italy',targetCountry:'United Kingdom',lang:'en'}]){
  const h=harness(),start=Date.now(),response=await h.load('app/api/openai/equivalent-search/route.ts').POST(request(task)),data=await response.json();
  console.log(JSON.stringify({kind:'equivalence',task,status:response.status,ms:Date.now()-start,origin:data.originProfile?.active_ingredients,results:data.equivalentResults?.raw_text,calls:h.calls}));
 }
 for(const task of [{drugName:'Co-codamol',originCountry:'United Kingdom',lang:'en'},{drugName:'Co-codamol',originCountry:'United Kingdom',drugDosage:'30/500',lang:'en'},{drugName:'Co Efferalgan',originCountry:'Italy',lang:'en'}]){
  const h=harness(),start=Date.now(),response=await h.load('app/api/openai/leaflet/route.ts').POST(request(task)),data=await response.json(),text=data.leaflet?.leaflet_text||'';
  console.log(JSON.stringify({kind:'leaflet',task,status:response.status,ms:Date.now()-start,leafletPresent:!!text,priceSection:text.match(/(?:Average Selling Price|Price)[\s\S]*/i)?.[0]||null,calls:h.calls}));
 }
})().catch(()=>{console.error('Live fixture test failed. No credentials printed.');process.exitCode=1;});
