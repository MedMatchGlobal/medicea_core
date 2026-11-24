const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const env={VERCEL_ENV:'preview',MEDICEA_MEMBERSHIP_PREVIEW:'true',VERCEL_URL:'medicea-core-build123.vercel.app',MEDICEA_MEMBERSHIP_ORIGIN:'https://medicea-core-canonical.vercel.app'};
function config(overrides={}){const module={exports:{}};vm.runInNewContext(fs.readFileSync('next.config.js','utf8'),{module,process:{env:{...env,...overrides}},URL,__dirname:'.'});return module.exports;}
test('preview browser entry redirects use exact deployment host and configured destination',async()=>{
 const rules=JSON.parse(JSON.stringify(await config().redirects()));assert.deepEqual(rules.map(r=>r.source),['/','/pets','/membership/:path*']);
 for(const rule of rules){assert.equal(rule.permanent,false);assert.equal(rule.destination,env.MEDICEA_MEMBERSHIP_ORIGIN+rule.source);const host=new RegExp('^'+rule.has[0].value+'$');assert.ok(host.test(env.VERCEL_URL));assert.equal(host.test('medicea-core-build123XvercelXapp'),false);assert.equal(host.test('attacker.vercel.app'),false);assert.equal(host.test('medicea-core-canonical.vercel.app'),false);}
 assert.equal(rules.some(r=>r.source.startsWith('/api')||r.source==='/:path*'),false);
});
test('production, development and disabled membership have no preview redirects',async()=>{
 for(const overrides of [{VERCEL_ENV:'production'},{VERCEL_ENV:'development'},{MEDICEA_MEMBERSHIP_PREVIEW:'false'},{VERCEL_URL:undefined},{VERCEL_URL:'attacker.example'},{VERCEL_URL:'medicea-core-canonical.vercel.app'}])assert.equal((await config(overrides).redirects()).length,0);
});
test('malformed configured origins never create a redirect',async()=>{
 for(const origin of ['', 'http://canonical.example','https://user:password@canonical.example','https://canonical.example/path','https://canonical.example?token=x','https://canonical.example#fragment','https://canonical.example:444'])assert.equal((await config({MEDICEA_MEMBERSHIP_ORIGIN:origin}).redirects()).length,0);
});
