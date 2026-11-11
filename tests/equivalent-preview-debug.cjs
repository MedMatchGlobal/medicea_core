const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, imports, env = {}) {
  const module = {exports:{}};
  const output = ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(output, {module,exports:module.exports,process:{env},Request,Response,require:name=>imports[name]});
  return module.exports;
}

test('raw equivalent diagnostics require both preview and explicit opt-in and never become matches', async () => {
  const helpers = load('app/lib/equivalent-results.ts', {});
  for (const [environment, optIn, expected] of [['preview',true,true],['preview',false,false],['production',true,false]]) {
    let calls = 0;
    const providerText = '1. Example product'; // Missing composition must still be rejected.
    const route = load('app/api/openai/equivalent-search/route.ts', {
      '@/app/lib/equivalent-results': helpers,
      '@/lib/membership/meter': {withMembership:run=>run},
      'next/server': {NextResponse:Response},
      '@/app/lib/openaiClient': {openaiFetch:async()=>Response.json({choices:[{message:{content:++calls===1 ? JSON.stringify({active_ingredients:[{name:'ingredient A',strength:'5 mg'}]}) : providerText}}]})},
    }, {VERCEL_ENV:environment});
    const response = await route.POST(new Request('https://preview.example/api/openai/equivalent-search', {
      method:'POST',headers:{'Content-Type':'application/json',...(optIn?{'x-medicea-equivalent-debug':'1'}:{})},
      body:JSON.stringify({originCountry:'GB',targetCountry:'IT',drugName:'Test product'}),
    }));
    const body = await response.json();
    assert.equal(response.status,200);
    assert.deepEqual(body.matches,[]);
    assert.equal(Boolean(body.equivalentDebug),expected);
    if (expected) {
      assert.equal(body.equivalentDebug.providerText,providerText);
      assert.equal(body.equivalentDebug.parsedCandidates,1);
      assert.equal(body.equivalentDebug.keptCandidates,0);
    }
    assert.equal(calls,2);
  }
});
