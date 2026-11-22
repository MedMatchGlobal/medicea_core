const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const env = { STRIPE_PERSONAL_MONTHLY_LEGACY_PRICE_ID: 'price_legacy' };
const stems = { pass7: '7_DAY', pass14: '14_DAY', pass30: '30_DAY', monthly: 'MONTHLY', annual: 'ANNUAL' };
const amounts = { pass7: [149, 179, 199], pass14: [199, 249, 279], pass30: [299, 359, 399], monthly: [299, 359, 399], annual: [1999, 2399, 2649] };
const currencies = ['GBP', 'EUR', 'USD'];
for (const plan of Object.keys(stems)) for (const currency of currencies) {
  env[`STRIPE_PERSONAL_${stems[plan]}_PRICE_ID${currency === 'GBP' ? '' : '_' + currency}`] = `price_${plan}${currency}`;
}
function load(file, imports = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: name => imports[name] || require(name), process: { env }, Date, Set, Response, Request, Buffer, URL, URLSearchParams, AbortSignal, fetch });
  return module.exports;
}
const config = load('lib/membership/config.ts');
const stripe = load('lib/membership/stripe.ts', { './config': config });
function price(plan, currency) {
  return { id: `price_${plan}${currency}`, livemode: false, active: true, currency: currency.toLowerCase(), unit_amount: amounts[plan][currencies.indexOf(currency)], recurring: plan === 'monthly' || plan === 'annual' ? { interval: plan === 'monthly' ? 'month' : 'year', interval_count: 1 } : null };
}
test('all approved prices resolve and validate in their own currency', () => {
  for (const plan of Object.keys(stems)) for (const currency of currencies) {
    assert.equal(config.planAmount(plan, currency), amounts[plan][currencies.indexOf(currency)]);
    assert.equal(stripe.planPriceId(plan, currency), `price_${plan}${currency}`);
    assert.equal(stripe.priceMatches(plan, price(plan, currency), currency), true);
    assert.equal(stripe.priceMatches(plan, { ...price(plan, currency), unit_amount: 1 }, currency), false);
    assert.equal(stripe.priceMatches(plan, { ...price(plan, currency), livemode: true }, currency), false);
  }
  assert.equal(stripe.priceMatches('monthly', price('monthly', 'EUR'), 'GBP'), false);
  assert.equal(stripe.priceMatches('monthly', { ...price('monthly', 'GBP'), recurring: { interval: 'year', interval_count: 1 } }), false);
});
test('EUR and USD passes grant access only for the paid amount and currency', () => {
  const now = Date.now();
  for (const currency of ['EUR', 'USD']) {
    const session = { livemode: false, metadata: { plan: 'pass7', currency }, mode: 'payment', status: 'complete', payment_status: 'paid', currency: currency.toLowerCase(), amount_total: amounts.pass7[currencies.indexOf(currency)] };
    const items = { data: [{ quantity: 1, price: price('pass7', currency) }], has_more: false };
    assert.equal(stripe.passAccess(session, items, Math.floor(now / 1000), now).active, true);
    assert.throws(() => stripe.passAccess({ ...session, amount_total: 1 }, items, Math.floor(now / 1000), now), /Unexpected test pass payment/);
  }
});
test('existing monthly subscribers retain access with the legacy price', () => {
  const now = Date.now();
  const subscription = { livemode: false, status: 'active', items: { data: [{ price: { id: 'price_legacy' }, current_period_end: Math.floor(now / 1000) + 3600 }] } };
  assert.equal(stripe.subscriptionAccess(subscription, now).active, true);
});
