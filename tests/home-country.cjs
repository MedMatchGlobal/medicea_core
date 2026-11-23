const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,imports={},env={}) {
 const module={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports,require:name=>imports[name]||require(name),Response,Request,URL,URLSearchParams,Set,Date,process:{env}});return module.exports;
}
const presentation=load('lib/membership/presentation.ts');
const countries=load('data/countries.ts');
const home=load('lib/membership/home-country.ts',{'@/data/countries':countries,'./presentation':presentation});
test('saved home country controls currency despite travel, with GBP fallback elsewhere',()=>{
 for(const [country,currency] of [['United Kingdom','GBP'],['Italy','EUR'],['United States','USD'],['France','EUR'],['Australia','GBP'],['Japan','GBP'],['Canada','GBP']]) {
  for(const location of ['GB','IT','US',null])assert.equal(home.homeCountryCurrency(country,location),currency);
 }
 assert.equal(home.homeCountryCurrency(null,'IT'),'EUR');assert.equal(home.homeCountryCurrency(null,'US'),'USD');assert.equal(home.homeCountryCurrency(null,'GB'),'GBP');
 assert.equal(home.validHomeCountry('IT'),null);assert.equal(home.validHomeCountry('<script>'),null);assert.equal(home.validHomeCountry({}),null);
});
test('searches use home country only when no explicit or restored source exists',()=>{
 assert.equal(home.defaultSourceCountry('','United Kingdom'),'United Kingdom');
 assert.equal(home.defaultSourceCountry('Italy','United Kingdom'),'Italy');
 assert.equal(home.defaultSourceCountry('',null),'');
 assert.equal(home.defaultSourceCountry('','Unknown'), '');
});
function preferences({enabled=true,origin=true,signedIn=true,fail=false}={}) {
 let saved=null,calls=0;
 const route=load('app/api/membership/preferences/route.ts',{
  '@/lib/membership/config':{membershipAccountEnabled:()=>enabled,sameOrigin:()=>origin},
  '@/lib/membership/auth':{membershipUser:async()=>signedIn?{id:'member',homeCountry:saved}:null,membershipAuth:async()=>({auth:{updateUser:async args=>{calls++;saved=args.data.medicea_home_country;assert.deepEqual(Object.keys(args),['data']);assert.deepEqual(Object.keys(args.data),['medicea_home_country']);return {data:{user:{id:'member',user_metadata:{medicea_home_country:saved}}},error:fail?{}:null};}}})},
  '@/lib/membership/home-country':home
 });
 return {...route,calls:()=>calls};
}
const request=body=>new Request('https://preview.example/api/membership/preferences',{method:'POST',body:JSON.stringify(body)});
test('preference saves to current account and subsequent reads return it without public caching',async()=>{
 const route=preferences();const result=await route.POST(request({homeCountry:'United Kingdom',memberId:'other',role:'admin'}));
 assert.equal(result.status,200);assert.equal(route.calls(),1);
 const read=await route.GET();assert.equal(read.headers.get('Cache-Control'),'no-store');assert.deepEqual(await read.json(),{homeCountry:'United Kingdom'});
});
test('disabled, foreign-origin, signed-out, invalid and failed saves cannot report success',async()=>{
 for(const [options,expected] of [[{enabled:false},404],[{origin:false},403],[{signedIn:false},401]]) {
  const route=preferences(options);assert.equal((await route.POST(request({homeCountry:'Italy'}))).status,expected);assert.equal(route.calls(),0);
 }
 const route=preferences();assert.equal((await route.POST(request({homeCountry:'Not a country'}))).status,400);assert.equal(route.calls(),0);
 assert.equal((await preferences({fail:true}).POST(request({homeCountry:'Italy'}))).status,503);
 assert.equal((await preferences({signedIn:false}).GET()).status,401);
});
test('checkout rejects stale or forged currency before contacting Stripe',async()=>{
 let stripeCalls=0;
 const config=load('lib/membership/config.ts');
 const route=load('app/api/membership/checkout/route.ts',{
  '@/lib/membership/config':{...config,membershipPreviewEnabled:()=>true,sameOrigin:()=>true},
  '@/lib/membership/auth':{membershipUser:async()=>({id:'member',homeCountry:'United Kingdom'})},
  '@/lib/membership/store':{membershipStatus:async()=>({premium:false})},
  '@/lib/membership/stripe':{validatePrice:async()=>{stripeCalls++;}},
  '@/lib/membership/home-country':home,
  '@/lib/membership/future-access':{memberReservation:async()=>null},
  '@/lib/membership/invoice-details':{ensureCustomerInvoiceDetails:async()=>{throw Error('Supplier mutation must not precede currency validation');}},
 });
 const response=await route.POST(new Request('https://preview.example/api/membership/checkout',{method:'POST',headers:{'x-vercel-ip-country':'IT'},body:JSON.stringify({plan:'pass7',currency:'EUR'})}));
 assert.equal(response.status,409);assert.equal((await response.json()).error,'CURRENCY_CHANGED');assert.equal(stripeCalls,0);
});
test('authenticated identity reads the saved home country on a new session',async()=>{
 const identity={id:'member',email:'member@example.test',email_confirmed_at:'2026-01-01',user_metadata:{medicea_home_country:'United Kingdom'}};
 const auth=load('lib/membership/auth.ts',{
  '@supabase/ssr':{createServerClient:()=>({auth:{getUser:async()=>({data:{user:identity},error:null})}})},
  'next/headers':{cookies:async()=>({getAll:()=>[]})},
  './home-country':home,
 },{MEDICEA_MEMBERSHIP_AUTH_URL:'https://auth.example.test',MEDICEA_MEMBERSHIP_AUTH_PUBLISHABLE_KEY:'fixture'});
 assert.equal((await auth.membershipUser()).homeCountry,'United Kingdom');
 identity.user_metadata.medicea_home_country='Not a country';
 assert.equal((await auth.membershipUser()).homeCountry,null);
});
