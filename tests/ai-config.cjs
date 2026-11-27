const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),ts=require('typescript');
function loader(env,fetch=()=>{throw Error('Unexpected network');}){
 const cache={};return function read(file){if(cache[file])return cache[file];const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports,process:{env},fetch,Response,Request,Headers,AbortController,AbortSignal,URL,Buffer,Date,Error,SyntaxError,TypeError,setTimeout,clearTimeout,console:{...console,warn(){}},require:name=>name.startsWith('.')?read(path.join(path.dirname(file),name+'.ts')):require(name)});return cache[file]=module.exports;};
}
const cfg='app/lib/ai-config.ts';
test('default provider is OpenAI so production does not move until the owner switches it',()=>{
 const c=loader({VERCEL_ENV:'production'})(cfg);assert.equal(c.aiProvider(),'openai');assert.equal(c.aiConfig().source,'default');
});
test('environment variables select provider and model; invalid values are ignored',()=>{
 let c=loader({MEDICEA_AI_PROVIDER:'anthropic',MEDICEA_AI_MODEL:'claude-opus-5-5'})(cfg);assert.equal(c.aiProvider(),'anthropic');assert.equal(c.claudeModel(),'claude-opus-5-5');
 c=loader({MEDICEA_AI_PROVIDER:'anthropic',MEDICEA_AI_MODEL:'gpt-4o; drop'})(cfg);assert.equal(c.claudeModel(),'claude-sonnet-5-5');
 c=loader({MEDICEA_AI_PROVIDER:'something-else'})(cfg);assert.equal(c.aiProvider(),'openai');
});
test('legacy design preview still uses Claude; other branches and tools stay closed',()=>{
 const on=loader({VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'design/riviera-one-page'})(cfg);assert.equal(on.aiProvider(),'anthropic');assert.equal(on.previewToolsEnabled(),true);
 const other=loader({VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'claude/prompts-v2'})(cfg);assert.equal(other.aiProvider(),'openai');assert.equal(other.previewToolsEnabled(),false);
});
test('Edge Config switches provider and model per environment without a redeploy and holds no keys',async()=>{
 let calls=0;const read=loader({VERCEL_ENV:'preview',EDGE_CONFIG:'https://edge-config.vercel.com/ecfg_test?token=t'},async(url,init)=>{calls++;assert.equal(url,'https://edge-config.vercel.com/ecfg_test/item/ai');assert.equal(init.headers.Authorization,'Bearer t');return Response.json({production:{provider:'openai'},preview:{provider:'anthropic',model:'claude-sonnet-5-5'}});});
 const c=read(cfg);assert.equal(c.aiProvider(),'openai');const r=await c.refreshAiConfig();assert.equal(r.provider,'anthropic');assert.equal(r.source,'edge-config');
 await c.refreshAiConfig();assert.equal(calls,1,'cached between calls');
});
test('failed Edge Config read keeps the last known value and never invents Claude',async()=>{
 let ok=true;const c=loader({VERCEL_ENV:'production',EDGE_CONFIG:'https://edge-config.vercel.com/ecfg_test?token=t'},async()=>{if(!ok)throw Error('down');return Response.json({production:{provider:'anthropic'}});})(cfg);
 await c.refreshAiConfig();assert.equal(c.aiProvider(),'anthropic');ok=false;await c.refreshAiConfig(true);assert.equal(c.aiProvider(),'anthropic');
 const fresh=loader({VERCEL_ENV:'production',EDGE_CONFIG:'https://edge-config.vercel.com/ecfg_test?token=t'},async()=>{throw Error('down');})(cfg);await fresh.refreshAiConfig();assert.equal(fresh.aiProvider(),'openai');
});
test('Claude requests use the configured model, cache the system prompt and never reach OpenAI',async()=>{
 const seen=[];const env={MEDICEA_AI_PROVIDER:'anthropic',MEDICEA_AI_MODEL:'claude-opus-5-5',ANTHROPIC_API_KEY:'k',OPENAI_API_KEY_1:'o'};
 const read=loader(env,async(url,init)=>{seen.push(url);return Response.json({stop_reason:'end_turn',content:[{type:'text',text:'ok'}]});});
 await read('app/lib/claude-preview.ts').claudeMessage('System text',[{role:'user',content:'hi'}],false,Date.now()+60000).catch(()=>{});
 assert.deepEqual(seen,['https://api.anthropic.com/v1/messages']);
 let body;const read2=loader(env,async(u,init)=>{body=JSON.parse(init.body);return Response.json({stop_reason:'end_turn',content:[{type:'text',text:'ok'}]});});
 await read2('app/lib/claude-preview.ts').claudeMessage('System text',[{role:'user',content:'hi'}],false,Date.now()+60000);
 assert.equal(body.model,'claude-opus-5-5');assert.deepEqual(body.system,[{type:'text',text:'System text',cache_control:{type:'ephemeral'}}]);
});
test('when Anthropic is selected and fails, the request fails: no silent OpenAI fallback',async()=>{
 const urls=[];const read=loader({MEDICEA_AI_PROVIDER:'anthropic',ANTHROPIC_API_KEY:'k',OPENAI_API_KEY_1:'o',VERCEL_ENV:'production'},async(url)=>{urls.push(url);return Response.json({error:{message:'overloaded'}},{status:529});});
 const client=read('app/lib/openaiClient.ts');
 await assert.rejects(()=>client.openaiFetch('https://api.openai.com/v1/chat/completions',{method:'POST',body:JSON.stringify({model:'gpt-4o',messages:[{role:'user',content:'x'}]})}));
 assert.ok(urls.length>0&&urls.every(u=>u.startsWith('https://api.anthropic.com/')),urls.join());
 const missing=loader({MEDICEA_AI_PROVIDER:'anthropic',OPENAI_API_KEY_1:'o'},()=>{throw Error('Unexpected network');})('app/lib/openaiClient.ts');
 await assert.rejects(()=>missing.openaiFetch('https://api.openai.com/v1/chat/completions',{method:'POST',body:JSON.stringify({messages:[]})}));
});
test('signing key no longer depends on the provider, so a switch keeps in-flight selections valid',()=>{
 const src=fs.readFileSync('app/lib/sonnet-research-support.ts','utf8');assert.doesNotMatch(src,/claudePreviewEnabled/);
});
