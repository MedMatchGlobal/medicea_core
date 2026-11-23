// Private build-only SMTP handshake. Reads the stored password in Vercel; never sends a message.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),ts=require('typescript');
if(process.env.VERCEL_ENV!=='preview'||process.env.VERCEL_PROJECT_ID!=='prj_zIesaaTzLOzNm32TYoEfcv7DQklE')throw Error('PRIVATE_PREVIEW_ONLY');
function load(file,imports={}){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{module,exports:module.exports,require:name=>imports[name]||require(name),process,URL,Date,Intl});return module.exports;}
process.env.MEDICEA_CONFIRMATIONS_PREVIEW='true';
const config=load('lib/membership/config.ts'),mail=load('lib/membership/confirmation-mail.ts',{'./config':config});
(async()=>{const transport=mail.confirmationMailTransport();try{await transport.verify();console.log('MEDICEA_BILLING_SMTP_VERIFIED connection=true TLS=true authentication=true messages_sent=0');}finally{transport.close();}})().catch(error=>{console.error('MEDICEA_BILLING_SMTP_UNVERIFIED '+String(error.code||'CONFIGURATION_OR_CONNECTION_ERROR').replace(/[^A-Z0-9_]/g,''));process.exitCode=1;});
