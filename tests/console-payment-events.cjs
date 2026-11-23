const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
test('customer-approved owner-console payments never grant or change membership access',async()=>{
 let calls=0;const unexpected=new Proxy({}, {get:()=>()=>{calls++;throw Error('Unexpected membership side effect');}}),module={exports:{}};
 const imports={'@/lib/membership/store':unexpected,'@/lib/membership/stripe':unexpected,'@/lib/membership/future-access':unexpected,'@/lib/membership/settlement':unexpected,'@/lib/membership/stripe-reconcile':unexpected};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/membership/stripe-events.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:n=>imports[n],Response,process:{env:{}}});
 const response=await module.exports.processStripeEvent({livemode:false,type:'checkout.session.completed',data:{object:{id:'cs_test_console',mode:'payment',metadata:{console_policy:'customer-approved-payment-request-v1'}}}});
 assert.equal(response.status,200);assert.equal((await response.json()).received,true);assert.equal(calls,0);
});
