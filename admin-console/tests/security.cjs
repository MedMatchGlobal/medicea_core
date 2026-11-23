const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),ts=require('typescript');
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',ID='33333333-3333-4333-8333-333333333333';
function load(file,imports={},env={}){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:name=>imports[name]||require(name),process:{env},Response,Request,URL,URLSearchParams,Date,AbortSignal});return module.exports;}
const policy=load('lib/policy.ts',{}, {MEDICEA_CONSOLE_OWNER_EMAIL:'Owner@example.test',MEDICEA_CONSOLE_SANDBOX:'true',VERCEL_ENV:'preview',MEDICEA_CONSOLE_ORIGIN:'https://console.test'});
test('production stays disabled and owner identity, origin and recent verified MFA fail closed',()=>{
 assert.equal(load('lib/policy.ts',{}, {MEDICEA_CONSOLE_SANDBOX:'true',VERCEL_ENV:'production'}).enabled(),false);
 for(const user of [null,{id:A,email:'owner@example.test'},{id:A,email:'other@example.test',email_confirmed_at:'today'}])assert.throws(()=>policy.ownerIdentity(user));
 const user={id:A,email:'OWNER@example.test',email_confirmed_at:'today'};assert.equal(policy.ownerIdentity(user).id,A);
 assert.throws(()=>policy.sameOrigin(new Request('https://console.test/api',{headers:{origin:'https://evil.test'}})));
 const now=Math.floor(Date.now()/1000),claims={sub:A,aal:'aal2',exp:now+300,amr:[{method:'totp',timestamp:now-30}]};
 policy.requireMfa(claims,user);
 for(const altered of [{aal:'aal1'},{sub:B},{exp:now-1},{amr:[]},{amr:[{method:'totp',timestamp:now-901}]}])assert.throws(()=>policy.requireMfa({...claims,...altered},user));
});
test('minor-unit amounts are exact; invalid, fractional and excessive financial actions are rejected',()=>{
 assert.equal(policy.moneyMinor('2.99'),299);assert.equal(policy.moneyMinor('0.01'),1);
 for(const value of ['1e2','-1','0','1.001','Infinity','10,00','10000.01'])assert.throws(()=>policy.moneyMinor(value));
 const body={operationId:ID,member:B,action:'refund',amountMinor:99,currency:'GBP',reason:'Customer request',charge:'ch_example',confirmed:true};
 assert.equal(policy.operationInput(body).amountMinor,99);
 for(const changed of [{confirmed:false},{amountMinor:-1},{amountMinor:1.5},{currency:'XXX'},{charge:'foreign'},{reason:''},{operationId:'bad'}])assert.throws(()=>policy.operationInput({...body,...changed}));
});
function fixture(failAfterProvider=false){
 let stored,posts=0,charge={id:'ch_example',customer:'cus_example',livemode:false,paid:true,status:'succeeded',currency:'gbp',amount:299,amount_refunded:0},refunds=[];const audit=[];
 const database={query:async(sql,values)=>{
  if(sql.startsWith('INSERT INTO medicea_billing.console_operation')){stored??={id:values[0],actor_id:values[1],fingerprint:values[4],state:'pending',created_at:new Date().toISOString()};return {rows:[]};}
  if(sql.startsWith('SELECT *'))return {rows:[stored]};
  if(sql.includes("state='succeeded'")){if(failAfterProvider){failAfterProvider=false;throw Error('Storage outage');}stored.state='succeeded';stored.result=JSON.parse(values[1]);}
  return {rows:[]};
 }};
 const customer={id:'cus_example',balance:0,metadata:{member_id:B}};
 const request=async(url,params,key)=>{
  if(url==='/refunds'&&!params)return {data:refunds,has_more:false};
  if(url==='/charges/ch_example')return charge;
  if(url==='/refunds'){posts++;const value={id:'re_example',charge:'ch_example',livemode:false,amount:Number(params.get('amount')),currency:'gbp',status:'succeeded',metadata:{console_operation:ID}};refunds.push(value);charge.amount_refunded+=value.amount;return value;}
  throw Error('Unexpected provider path');
 };
 const operations=load('lib/operations.ts',{'./policy':policy,'./db':{db:()=>database,audit:async(...v)=>audit.push(v)},'./accounts':{customerFor:async()=>customer},'./stripe':{stripe:request,paymentUrl:()=>null}});
 return {operations,getPosts:()=>posts,getStored:()=>stored,charge,audit};
}
const body={operationId:ID,member:B,action:'refund',amountMinor:299,currency:'GBP',reason:'Customer request',charge:'ch_example',confirmed:true};
test('refunds validate ownership and remaining balance; duplicate operations return one provider refund',async()=>{
 const f=fixture();for(const change of [{customer:'cus_other'},{currency:'eur'},{disputed:true},{amount_refunded:1}])assert.throws(()=>f.operations.validateRefund({...f.charge,...change},'cus_example',policy.operationInput(body)));
 const first=await f.operations.performOperation(A,body),second=await f.operations.performOperation(A,body);assert.equal(first.providerRef,second.providerRef);assert.equal(f.getPosts(),1);
 await assert.rejects(()=>f.operations.performOperation(A,{...body,amountMinor:100}),/OPERATION_ID_REUSED/);
});
test('a provider refund survives a failed database result write and recovers without a second refund',async()=>{
 const f=fixture(true);await assert.rejects(()=>f.operations.performOperation(A,body));assert.equal(f.getPosts(),1);
 const recovered=await f.operations.performOperation(A,body);assert.equal(recovered.providerRef,'re_example');assert.equal(f.getPosts(),1);assert.ok(f.audit.some(v=>v[1]==='operation.needs_review'));
});
test('all data and action routes require owner MFA; mutations reject forged origins first',async()=>{
 let calls=0;
 const denied={ownerSession:async()=>{throw new policy.ConsoleError('MFA_REQUIRED',403);}};
 const http=load('lib/http.ts',{'./policy':policy});
 const accounts=load('app/api/accounts/route.ts',{'../../../lib/auth':denied,'../../../lib/accounts':{account:async()=>calls++,accounts:async()=>calls++},'../../../lib/http':http});
 assert.equal((await accounts.GET(new Request('https://console.test/api/accounts'))).status,403);
 const actions=load('app/api/operations/route.ts',{'../../../lib/auth':denied,'../../../lib/policy':policy,'../../../lib/operations':{performOperation:async()=>calls++},'../../../lib/http':http});
 assert.equal((await actions.POST(new Request('https://console.test/api/operations',{method:'POST',headers:{origin:'https://evil.test'}}))).status,403);
 assert.equal(calls,0);
});
