const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const compiled=ts.transpileModule(fs.readFileSync('app/account/actions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const primary={id:'primary',factor_type:'totp',status:'verified'};
function harness({user=true,level='aal2',factors=[primary],identityError=null,assuranceError=null,cleanupError=null,verifyError=null}={}){
  const calls=[];const exports={};
  const client={auth:{getUser:async()=>({data:{user:user?{id:'owner'}:null},error:identityError}),mfa:{
    listFactors:async()=>({data:{totp:factors.filter(f=>f.factor_type==='totp'),all:factors},error:null}),
    getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:level},error:assuranceError}),
    unenroll:async({factorId})=>{calls.push(['remove',factorId]);return {error:cleanupError};},
    enroll:async(params)=>{calls.push(['enroll',params.friendlyName]);return {data:{id:'backup',totp:{qr:'private-qr',secret:'must-not-return'}},error:null};},
    challengeAndVerify:async(params)=>{calls.push(['verify',params.factorId]);return {error:verifyError};},
  }}};
  vm.runInNewContext(compiled,{exports,require(name){
    if(name==='next/navigation')return {redirect(path){throw new Error('REDIRECT:'+path);}};
    if(name==='@/lib/supabase/server')return {accountClient:async()=>client,authConfigured:()=>true};
    throw new Error('Unexpected dependency');
  }});
  return {actions:exports,calls};
}
test('backup enrollment rejects unsigned, aal1 and unverifiable sessions before changes',async()=>{
  for(const opts of [{user:false},{level:'aal1'},{identityError:{}},{assuranceError:{}},{factors:[]}]){
    const h=harness(opts);assert.ok((await h.actions.beginMfa(true)).error);assert.equal(h.calls.length,0);
  }
});
test('adding a backup preserves every verified factor and exposes no raw secret',async()=>{
  const unfinished={id:'unfinished',factor_type:'totp',status:'unverified'};
  const h=harness({factors:[primary,unfinished]});const result=await h.actions.beginMfa(true);
  assert.equal(h.calls[0][1],'unfinished');assert.equal(h.calls[1][1],'Backup authenticator');assert.equal(result.id,'backup');
  assert.ok(!JSON.stringify(result).includes('must-not-return'));assert.ok(!h.calls.some(c=>c[0]==='remove'&&c[1]==='primary'));
});
test('failed unfinished-factor cleanup does not create a new factor',async()=>{
  const h=harness({factors:[primary,{id:'unfinished',factor_type:'totp',status:'unverified'}],cleanupError:{}});
  assert.ok((await h.actions.beginMfa(true)).error);assert.equal(h.calls.length,1);
});
test('primary setup cannot replace an enrolled primary and duplicate backups are rejected',async()=>{
  const h=harness();assert.ok((await h.actions.beginMfa(false)).error);assert.equal(h.calls.length,0);
  const two=harness({factors:[primary,{...primary,id:'backup'}]});assert.ok((await two.actions.beginMfa(true)).error);assert.equal(two.calls.length,0);
});
test('primary enrollment remains possible before initial MFA setup',async()=>{
  const h=harness({factors:[],level:'aal1'});assert.equal((await h.actions.beginMfa()).id,'backup');assert.equal(h.calls[0][1],'My authenticator');
});
test('selected primary or backup is passed to provider verification; rejected code does not redirect',async()=>{
  for(const id of ['primary','backup']){
    const h=harness();await assert.rejects(h.actions.verifyMfa(id,'012345'),/REDIRECT:\/account/);assert.equal(h.calls[0][1],id);
  }
  const h=harness({verifyError:{}});assert.ok((await h.actions.verifyMfa('backup','012345')).error);
});
