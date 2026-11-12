const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const preview={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'design/riviera-one-page',ANTHROPIC_API_KEY:'test-key'};
function load(env,fetch){const cache={};return function read(file){if(cache[file])return cache[file];const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports,process:{env},fetch,Response,Request,Headers,AbortController,URL,Date,Error,JSON,setTimeout,clearTimeout,console,require:name=>name.startsWith('.')?read(path.join(path.dirname(file),name+'.ts')):require(name)});return cache[file]=module.exports;};}
const request=origin=>new Request('https://preview.example/api/preview/bare-equivalents',{method:'POST',headers:{origin},body:'{}'});
test('bare request sends exactly the owner wording, no system prompt or schema, and returns all text without product filtering',async()=>{
 let calls=0;
 const text='## Answer\nZapain; Solpadol; generic co-codamol.\nUncertain candidate: Example 8/500.\nhttps://example.org/a';
 const blocks=[{type:'text',text,citations:[{type:'web_search_result_location',url:'https://example.org/a',title:'Example',cited_text:'Source text'}]}];
 const read=load(preview,async(url,init)=>{
  calls++;assert.equal(url,'https://api.anthropic.com/v1/messages');
  const body=JSON.parse(init.body);
  assert.equal(Object.hasOwn(body,'system'),false);assert.equal(Object.hasOwn(body,'response_format'),false);
  assert.equal(body.model,'claude-sonnet-5-5');assert.equal(body.output_config.effort,'medium');
  assert.deepEqual(body.messages,[{role:'user',content:'List me all equivalents in the UK to the Italian Co-Efferalgan 500mg + 30mg compresse rivestite con film'}]);
  assert.deepEqual(body.tools,[{type:'web_search_20250305',name:'web_search'}]);
  return Response.json({model:body.model,stop_reason:'end_turn',content:[{type:'web_search_tool_result',content:[]},...blocks],usage:{input_tokens:10,output_tokens:20}});
 });
 const response=await read('app/lib/bare-equivalent-search.ts').bareEquivalentSearch(request('https://preview.example'));
 const body=await response.json();assert.equal(response.status,200);assert.equal(calls,1);
 assert.equal(body.response,text);assert.deepEqual(body.textBlocks,blocks);assert.equal(body.usage.output_tokens,20);
});
test('bare comparison cannot run in production or from a different origin',async()=>{
 let calls=0;const fetch=()=>{calls++;throw Error('Unexpected paid request');};
 const production=load({...preview,VERCEL_ENV:'production'},fetch)('app/lib/bare-equivalent-search.ts');
 assert.equal((await production.bareEquivalentSearch(request('https://preview.example'))).status,404);
 const handler=load(preview,fetch)('app/lib/bare-equivalent-search.ts');
 assert.equal((await handler.bareEquivalentSearch(request('https://unrelated.example'))).status,403);assert.equal(calls,0);
});
test('provider failure is not retried and does not expose credentials or upstream text',async()=>{
 let calls=0;const read=load(preview,async()=>{calls++;throw Error('private-provider-detail');});
 const response=await read('app/lib/bare-equivalent-search.ts').bareEquivalentSearch(request('https://preview.example'));
 const text=await response.text();assert.equal(response.status,503);assert.equal(calls,1);assert.doesNotMatch(text,/test-key|private-provider-detail/);
});
