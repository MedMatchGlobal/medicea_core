const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const baseline = require('./fixtures/protected-prompts.json');
const names = new Set(['system1','user1','system2','user2','system','user','prompt','translatorSystem','translatorUser','structuredInstruction','query']);
test('refined search prompts, message content and model settings remain exactly preserved', () => {
  for (const [file, expected] of Object.entries(baseline)) {
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8').replace(/\r\n/g, '\n');
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const entries = [];
    function visit(node) {
      if (ts.isVariableDeclaration(node) && names.has(node.name.getText(ast)) && node.initializer) entries.push({name:node.name.getText(ast), expression:node.initializer.getText(ast)});
      if (ts.isPropertyAssignment(node) && ['model','temperature','seed','max_tokens','response_format'].includes(node.name.getText(ast))) entries.push({name:node.name.getText(ast), expression:node.initializer.getText(ast)});
      if (ts.isPropertyAssignment(node) && node.name.getText(ast) === 'content') entries.push({name:'message content', expression:node.initializer.getText(ast)});
      ts.forEachChild(node, visit);
    }
    visit(ast);
    assert.deepEqual(entries, expected, `Protected prompt or model setting changed in ${file}. Obtain explicit authorization; do not silently replace the baseline.`);
  }
});
