const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
test('public core has no private account, storage routes or credentials client', () => {
 for (const file of ['app/account/page.tsx', 'app/vault/page.tsx', 'app/vault/documents/[id]/route.ts', 'app/vault/security-check/page.tsx', 'middleware.ts', 'lib/supabase/server.ts', 'lib/vault-access.ts']) {
  assert.equal(fs.existsSync(path.join(root, file)), false, file);
 }
 const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
 for (const dep of ['tus-js-client']) {
  assert.equal(Boolean(pkg.dependencies?.[dep] || pkg.devDependencies?.[dep]), false, dep);
 }
});
