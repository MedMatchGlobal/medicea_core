const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
function load(file) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const output = ts.transpileModule(source, {compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  }}).outputText;
  const module = {exports: {}};
  vm.runInNewContext(output, {module, exports: module.exports, require});
  return module.exports;
}
test('doctor discovery defaults to general care and honors an explicit specialty', () => {
  const {careSearchQuery} = load('app/lib/care-search.ts');
  assert.equal(careSearchQuery('doctor', 'London'), 'general medical doctors near London');
  assert.equal(careSearchQuery('doctor', 'London', 'Urology'), 'Urology medical doctors near London');
  assert.equal(careSearchQuery('hospital', 'Rome'), 'human general hospitals near Rome');
  assert.equal(careSearchQuery('pharmacy', 'Paris'), 'pharmacies near Paris');
});
test('condition field accepts names beyond the suggestions and rejects no unknown condition', () => {
  const Picker = load('app/components/ConditionPicker.tsx').default;
  const html = renderToStaticMarkup(React.createElement(Picker, {
    label: 'Condition', value: 'A condition absent from the catalog', onChange() {},
    groups: [{label: 'Suggestions', items: ['Cancer', 'Prostate cancer']}], hint: 'Type any condition',
  }));
  assert.match(html, /value="A condition absent from the catalog"/);
  assert.match(html, /maxlength="160"/i);
  assert.doesNotMatch(html, /<select/);
});
test('missing-condition suggestions and care guidance cover all supported languages', () => {
  const {conditionAdditions} = load('data/condition-additions.ts');
  const {searchFeedback, urgentCareNotice} = load('app/i18n/search-feedback.ts');
  const languages = ['en','af','ar','cs','da','de','el','es','fi','fr','he','hi','hu','it','ja','ko','nl','no','pl','pt','ro','ru','sv','tr','zh'];
  for (const lang of languages) {
    const {labels, hint} = conditionAdditions(lang);
    assert.deepEqual(Object.keys(labels).sort(), ['cancer','haemochromatosis','prostate_cancer']);
    for (const text of [...Object.values(labels), hint, ...Object.values(searchFeedback(lang))]) assert.ok(text.trim());
    assert.match(urgentCareNotice(lang), /111/);
    assert.match(urgentCareNotice(lang), /999/);
    if (lang !== 'en') assert.notEqual(hint, conditionAdditions('en').hint);
  }
});
