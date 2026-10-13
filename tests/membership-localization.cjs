const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const languages=['en','af','ar','cs','da','de','el','es','fi','fr','he','hi','hu','it','ja','ko','nl','no','pl','pt','ro','ru','sv','tr','zh'];
const folder='app/i18n/membership/';
const english=JSON.parse(fs.readFileSync(folder+'en.json','utf8'));
test('all 25 membership languages cover every account, dialog, footer and information string',()=>{
 for(const lang of languages){const copy=JSON.parse(fs.readFileSync(folder+lang+'.json','utf8'));assert.deepEqual(Object.keys(copy).sort(),Object.keys(english).sort(),lang);
  for(const key of Object.keys(english)){assert.equal(typeof copy[key],'string',lang+'/'+key);assert.ok(copy[key].trim(),lang+'/'+key);
   const placeholders=text=>Array.from(text.matchAll(/<\w+\/>/g),match=>match[0]).sort();
   assert.deepEqual(placeholders(copy[key]),placeholders(english[key]),lang+'/'+key+' placeholders');
   assert.doesNotMatch(copy[key],/<script|javascript:/i,lang+'/'+key);
  }
  if(lang!=='en'){assert.notEqual(copy.headline,english.headline,lang);assert.notEqual(copy.privacyAccount,english.privacyAccount,lang);}
 }
});
test('branding stays in a shared wordmark instead of being translated or inserted as raw HTML',()=>{
 const renderer=fs.readFileSync('app/i18n/membership.tsx','utf8');assert.match(renderer,/MediceaBrand/);assert.doesNotMatch(renderer,/dangerouslySetInnerHTML/);
 const brand=fs.readFileSync('app/components/MediceaBrand.tsx','utf8');assert.match(brand,/<span>medi<\/span><span>céa<\/span>/);assert.match(brand,/dir="ltr"/);
});
