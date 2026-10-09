const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const source=fs.readFileSync('app/account/recovery/actions.ts','utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function harness({user=true,level='aal2',enabled=true,error=null}={}){
  const calls=[];
  const api={
    getUser:async()=>({data:{user:user?{id:'owner'}:null},error:null}),
    mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:level},error:null}),recoveryCodes:{
      generate:async()=>{calls.push('generate');return {data:{codes:['private-test-code'],access_token:'never-return'},error};},
      regenerate:async()=>{calls.push('regenerate');return {data:{codes:['private-test-code']},error};},
      verify:async()=>{calls.push('verify');level='aal2';return {data:{access_token:'never-return'},error};},
    }},
  };
  const exports={};
  vm.runInNewContext(compiled,{exports,require(name){
    if(name==='next/navigation')return {redirect(path){throw new Error(`REDIRECT:${path}`);}};
    if(name==='@/lib/recovery-config')return {recoveryEnabled:()=>enabled};
    if(name==='@/lib/supabase/server')return {authConfigured:()=>true,accountClient:async()=>({auth:api})};
    throw new Error('Unexpected dependency');
  }});
  return {actions:exports,calls};
}
test('generation denies anonymous and email-only sessions without invoking provider mutations',async()=>{
  for(const options of [{user:false},{level:'aal1'},{enabled:false}]){
    const h=harness(options);assert.ok((await h.actions.generateRecoveryCodes(false,true)).error);assert.equal(h.calls.length,0);
  }
});
test('replacement requires explicit confirmation and uses regenerate only',async()=>{
  const h=harness();assert.ok((await h.actions.generateRecoveryCodes(true,false)).error);assert.equal(h.calls.length,0);
  const result=await h.actions.generateRecoveryCodes(true,true);assert.equal(h.calls[0],'regenerate');assert.equal(result.codes.length,1);
});
test('generation returns only display codes and count, never session tokens',async()=>{
  const h=harness();const result=await h.actions.generateRecoveryCodes(false,true);
  assert.equal(Object.keys(result).sort().join(','),'codes,remaining');assert.ok(!JSON.stringify(result).includes('never-return'));
});
test('recovery verification requires email sign-in and validates input before provider call',async()=>{
  for(const [options,code] of [[{user:false},'abcd-efgh-ijkl-mnop'],[{},'<script>'],[{},'x'.repeat(129)],[{enabled:false},'abcd-efgh-ijkl-mnop']]){
    const h=harness(options);assert.ok((await h.actions.verifyRecoveryCode(code)).error);assert.equal(h.calls.length,0);
  }
});
test('incorrect, reused, rate-limited and disabled provider responses do not grant access or leak errors',async()=>{
  for(const code of ['mfa_verification_failed','mfa_recovery_codes_locked','mfa_recovery_codes_verify_not_enabled']){
    const h=harness({level:'aal1',error:{code,message:'secret-provider-detail'}});
    const result=await h.actions.verifyRecoveryCode('abcd-efgh-ijkl-mnop');assert.ok(result.error);assert.ok(!result.error.includes('secret-provider-detail'));
  }
});
test('successful native verification redirects only after confirming aal2 and returns no token',async()=>{
  const h=harness({level:'aal1'});await assert.rejects(h.actions.verifyRecoveryCode('abcd-efgh-ijkl-mnop'),/REDIRECT:\/account/);
});
