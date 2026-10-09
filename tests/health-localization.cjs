const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const root=path.join(__dirname,'..');
const folder=path.join(root,'app/health-i18n/catalogs');
const languages=['en','af','ar','cs','da','de','el','es','fi','fr','he','hi','hu','it','ja','ko','nl','no','pl','pt','ro','ru','sv','tr','zh'];
const english=require('../app/health-i18n/catalogs/en.json');
test('all homepage languages have complete health catalogs with intact placeholders and limits',()=>{
  for(const lang of languages){
    const catalog=JSON.parse(fs.readFileSync(path.join(folder,lang+'.json'),'utf8'));
    assert.deepEqual(Object.keys(catalog).sort(),Object.keys(english).sort(),lang);
    for(const [key,value]of Object.entries(catalog)){
      assert.equal(typeof value,'string',`${lang}: ${key}`);assert.ok(value.trim());
      assert.deepEqual((value.match(/\{\w+\}/g)||[]).sort(),(key.match(/\{\w+\}/g)||[]).sort(),`${lang}: placeholders in ${key}`);
      for(const number of key.match(/\b\d+\b/g)||[])assert.ok(value.includes(number),`${lang}: missing limit ${number}`);
      for(const email of key.match(/[\w.-]+@[\w.-]+\.[a-z]+/g)||[])assert.ok(value.includes(email),`${lang}: changed support address`);
    }
  }
});
test('interface translation interpolates counts and leaves unknown user text unchanged',()=>{
  const source=fs.readFileSync(path.join(root,'app/health-i18n/HealthLanguage.tsx'),'utf8');
  const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
  const module={exports:{}};
  vm.runInNewContext(output,{module,exports:module.exports,require:name=>name==='../LanguageProvider'?{}:name==='./catalogs/en.json'?english:require(name)});
  const {translate}=module.exports;
  const fr=require('../app/health-i18n/catalogs/fr.json');
  assert.equal(translate(fr,'Language'),fr.Language);
  assert.equal(translate(fr,'{count} unused recovery codes remain.',{count:3}),fr['{count} unused recovery codes remain.'].replace('{count}','3'));
  const userText='My fictional report <script>alert(1)</script>';
  assert.equal(translate(fr,userText),userText);
  assert.equal(translate({},'Language'),'Language');
});
test('every static health text and placeholder used by the screens has a source entry',()=>{
  for(const file of ['app/account/page.tsx','app/account/AccountForms.tsx','app/account/MfaChallenge.tsx','app/account/recovery/page.tsx','app/account/recovery/RecoveryForms.tsx','app/vault/page.tsx','app/vault/MedicineForms.tsx','app/vault/VaultForms.tsx']){
    const source=fs.readFileSync(path.join(root,file),'utf8');
    const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
    function visit(node){
      if(ts.isJsxSelfClosingElement(node)&&node.tagName.getText(ast)==='HealthText'){
        const attr=node.attributes.properties.find(p=>ts.isJsxAttribute(p)&&p.name.getText(ast)==='text');
        const value=attr?.initializer;
        const literal=value&&ts.isJsxExpression(value)?value.expression:value;
        if(literal&&ts.isStringLiteral(literal))assert.ok(literal.text in english,`${file}: ${literal.text}`);
      }
      if(ts.isCallExpression(node)&&node.expression.getText(ast)==='tr'&&ts.isStringLiteral(node.arguments[0]))assert.ok(node.arguments[0].text in english);
      ts.forEachChild(node,visit);
    }visit(ast);
  }
});
