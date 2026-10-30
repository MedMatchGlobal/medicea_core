// Read-only provider check. Never logs credentials, tokens, orders or response bodies.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const EXPECTED_EMAIL='medicea-play-billing@app-ab26f924.iam.gserviceaccount.com';
function load(relative,imports={}){
 const module={exports:{}};
 const source=ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',relative),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(source,{module,exports:module.exports,require:n=>imports[n]||require(n),process,Buffer,Date,URL,URLSearchParams,Response,Request,AbortSignal,fetch});return module.exports;
}
async function main(){
 const report={checkedAt:new Date().toISOString(),readOnly:true,credentialValidated:false,oauthAuthenticated:false,billingReadAuthorized:false};
 try{
  if(!process.argv[2])throw Error('Credential path required');
  const account=JSON.parse(fs.readFileSync(process.argv[2],'utf8').replace(/^\uFEFF/,''));
  if(account.type!=='service_account'||account.project_id!=='app-ab26f924'||account.client_email!==EXPECTED_EMAIL||account.token_uri!=='https://oauth2.googleapis.com/token'||typeof account.private_key!=='string')throw Error('Unexpected credential identity');
  require('node:crypto').createPrivateKey(account.private_key);
  report.credentialValidated=true;
  process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL=account.client_email;
  process.env.GOOGLE_PLAY_PRIVATE_KEY=account.private_key;
  const catalogue=load('lib/membership/play-catalogue.ts');
  const api=load('lib/membership/play-api.ts',{'./play-policy':catalogue});
  const token=await api.googleAccessToken();report.oauthAuthenticated=true;
  const response=await fetch('https://androidpublisher.googleapis.com/androidpublisher/v3/applications/global.medicea.app/purchases/voidedpurchases?type=1&pageSelection.maxResults=1',{
   headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(20000),cache:'no-store'
  });
  report.billingReadHttpStatus=response.status;report.billingReadAuthorized=response.ok;
  // Redacted error categories are sufficient for diagnosing permission propagation.
  if(!response.ok){const error=await response.json().catch(()=>({}));report.providerErrorCategory=error.error?.status||'UNAVAILABLE';}
 }catch{report.failureStage=report.oauthAuthenticated?'billing-read':report.credentialValidated?'oauth':'credential-validation';process.exitCode=1;}
 finally{delete process.env.GOOGLE_PLAY_PRIVATE_KEY;delete process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL;}
 if(!report.billingReadAuthorized)process.exitCode=1;
 if(process.env.MEDICEA_PLAY_CHECK_REPORT)fs.writeFileSync(process.env.MEDICEA_PLAY_CHECK_REPORT,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
}
main().catch(()=>{console.error('Read-only provider check could not complete');process.exitCode=1;});
