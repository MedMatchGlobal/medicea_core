const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function route(responses) {
  const calls = [];
  const source = fs.readFileSync(path.join(__dirname, '../app/api/openai/pet-generics/route.ts'), 'utf8');
  const output = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  const module = {exports:{}};
  vm.runInNewContext(output, {module,exports:module.exports,console:{log(){},error(){}},require(name){
    if (name === 'next/server') return {NextResponse:{json:(data, options) => Response.json(data, options)}};
    if (name === '@/app/lib/openaiClient') return {openaiFetch:async (url, options) => {
      calls.push(JSON.parse(options.body));
      return Response.json({choices:[{message:{content:responses.shift()}}]});
    }};
    throw Error(name);
  }});
  return {post:module.exports.POST,calls};
}
const request = body => ({json:async () => body});
test('veterinary generic search targets the home country and filters wrong strengths', async () => {
  const api = route([JSON.stringify({active_ingredients:[{name:'ExampleIngredient',strength:'25 mg'}]}),
    '- Generic A: 25 mg of ExampleIngredient\n- Generic B: 50 mg of ExampleIngredient']);
  const res = await api.post(request({originCountry:'United Kingdom',targetCountry:'France',drugName:'FictionalVetDrug'}));
  const data = await res.json();
  assert.equal(api.calls.length, 2);
  assert.equal(api.calls[0].temperature, 0);
  assert.match(api.calls[0].messages[1].content, /veterinary medicine/);
  assert.match(api.calls[1].messages[1].content, /generic veterinary products available in United Kingdom/);
  assert.match(api.calls[1].messages[0].content, /Do not substitute human medicines/);
  assert.match(data.equivalentResults.raw_text, /Generic A/);
  assert.doesNotMatch(data.equivalentResults.raw_text, /Generic B/);
});
test('invalid input and incomplete veterinary composition never trigger a generic search', async () => {
  const invalid = route([]);
  assert.equal((await invalid.post(request({drugName:'Example'}))).status, 400);
  assert.equal(invalid.calls.length, 0);
  for (const profile of [{active_ingredients:[]},{active_ingredients:[{name:'ExampleIngredient'}]}]) {
    const api = route([JSON.stringify(profile)]);
    const data = await (await api.post(request({originCountry:'United Kingdom',drugName:'FictionalVetDrug'}))).json();
    assert.equal(data.error, 'NOT_FOUND_ORIGIN');
    assert.equal(api.calls.length, 1);
  }
});
