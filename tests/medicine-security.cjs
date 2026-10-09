const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, imports = {}) {
  const module = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(output, { module, exports: module.exports, require: n => { if (!(n in imports)) throw Error(n); return imports[n]; } });
  return module.exports;
}
const fields = load('lib/vault-medicines.ts');
const ids = load('lib/vault-files.ts');
const id = 'f2ac5baa-06ad-4cbc-a123-a85313ccef15';
function harness({ allowed = true, dbError = null, deleted = [{ id }] } = {}) {
  const calls = [];
  const query = {
    insert: async row => { calls.push(['insert', row]); return { error: dbError }; },
    delete: () => { calls.push(['delete']); return query; },
    eq: (k, v) => { calls.push(['eq', k, v]); return query; },
    select: async () => ({ error: dbError, data: deleted }),
  };
  const actions = load('app/vault/medicine-actions.ts', {
    'node:crypto': { randomUUID: () => id }, 'next/cache': { revalidatePath: p => calls.push(['refresh', p]) },
    '@/lib/vault-access': { vaultAccess: async () => allowed ? { ok: true, user: { id: 'owner-a' }, client: { from: table => { assert.equal(table, 'vault_beta_medicines'); return query; } } } : { ok: false } },
    '@/lib/vault-files': ids, '@/lib/vault-medicines': fields,
  });
  return { calls, ...actions };
}
function form() { const f = new FormData(); f.set('name', ' Test medicine '); f.set('strength', '10 mg'); f.set('fictional', 'yes'); f.set('user_id', 'attacker'); return f; }
test('signed-out and non-MFA access cannot save or delete', async () => {
  const h = harness({ allowed: false }); assert.ok((await h.saveMedicine(form())).error); assert.ok((await h.removeMedicine(id)).error); assert.deepEqual(h.calls, []);
});
test('invalid and non-fictional entries never reach storage', async () => {
  for (const [key, value] of [['fictional', 'no'], ['name', ' '], ['name', 'x'.repeat(121)], ['strength', 'x'.repeat(81)], ['notes', 'x'.repeat(501)], ['name', 'hello\nworld']]) {
    const f = form(); f.set(key, value); const h = harness(); assert.ok((await h.saveMedicine(f)).error); assert.deepEqual(h.calls, []);
  }
});
test('owner comes from verified session, ignoring caller-supplied owner', async () => {
  const h = harness(); assert.ok((await h.saveMedicine(form())).success); const row = h.calls[0][1]; assert.equal(row.user_id, 'owner-a'); assert.equal(row.name, 'Test medicine'); assert.equal(row.notes, '');
});
test('provider failure does not report saved medicine or leak diagnostics', async () => {
  const h = harness({ dbError: { message: 'private database diagnostic' } }); const r = await h.saveMedicine(form()); assert.ok(r.error); assert.equal(r.success, undefined); assert.ok(!r.error.includes('diagnostic')); assert.equal(h.calls.length, 1);
});
test('removal requires a valid id and filters by authenticated owner', async () => {
  const h = harness(); assert.ok((await h.removeMedicine('../other-owner')).error); assert.deepEqual(h.calls, []); assert.ok((await h.removeMedicine(id)).success); assert.deepEqual(h.calls.slice(1,3), [['eq','id',id], ['eq','user_id','owner-a']]);
});
test('missing or inaccessible medicine is not reported removed', async () => {
  const h = harness({ deleted: [] }); assert.ok((await h.removeMedicine(id)).error); assert.ok(!h.calls.some(c => c[0] === 'refresh'));
});
