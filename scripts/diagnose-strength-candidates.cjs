// Fixed public example diagnostics only: never enable this observer for user queries.
const {harness,request}=require('./test-production-ui-live.cjs');
(async()=>{
 const h=harness((body,payload)=>console.log(JSON.stringify({stage:body.messages[0].content.startsWith('Identify')?'origin':'destination',model:payload.model,output:payload.choices?.[0]?.message?.content}))),route=h.load('app/api/openai/equivalent-search/route.ts');
 const response=await route.POST(request({drugName:'Co-codamol',originCountry:'United Kingdom',targetCountry:'Italy',drugDosage:'30/500'}));const result=await response.json();console.log(JSON.stringify({status:response.status,accepted:result.matches,error:result.error,calls:h.calls}));
})().catch(()=>{console.error('Public diagnostic failed; no credentials printed.');process.exitCode=1;});
