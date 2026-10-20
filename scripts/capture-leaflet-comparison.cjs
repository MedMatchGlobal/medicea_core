// Capture exact provider request bodies without credentials or live requests.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.join(__dirname,'..'),backup=path.join(root,'backups/leaflet-2026-10-20-1000-bst');
async function capture(historical){
 const cache={},calls=[];
 function load(file){
  if(cache[file])return cache[file];const absolute=path.join(root,file),old=path.join(backup,file+'.txt');
  const source=fs.readFileSync(historical&&fs.existsSync(old)?old:absolute,'utf8'),module={exports:{}};
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{module,exports:module.exports,URL,Set,Map,process:{env:{}},require(name){
   if(name==='./openaiClient')return {openaiFetch:async(url,init,options)=>{calls.push({url,body:JSON.parse(init.body),options});return Response.json({status:'incomplete'});}};
   if(name.startsWith('.'))return load(path.relative(root,path.resolve(path.dirname(absolute),name))+'.ts');throw Error('Unexpected dependency '+name);
  }});return cache[file]=module.exports;
 }
 const instructions=load('app/lib/leaflet-prompts.ts').organisedHumanLeafletPrompt('English');
 try{await load('app/lib/grounded-leaflet.ts').groundedLeaflet(instructions,{drugName:'Co Codamol',originCountry:'United Kingdom',drugDosage:'',language:'en',audience:'human',selectedProfile:null});}catch{}
 if(calls.length!==1)throw Error('Expected exactly one captured request');return calls[0];
}
(async()=>{const dir=path.join(root,'app/lib/leaflet-comparison-fixtures');fs.mkdirSync(dir,{recursive:true});for(const [name,historical]of [['0940',true],['current',false]]){const text=JSON.stringify(await capture(historical),null,2)+'\n',file=path.join(dir,name+'.json');if(process.argv.includes('--check')){if(fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n')!==text)throw Error('Captured fixture differs: '+name);}else fs.writeFileSync(file,text);}console.log('Verified two fixed public requests; no provider calls made.');})();
