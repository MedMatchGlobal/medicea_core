// Public fixture only. Do not print credentials or response content.
const key=process.env.OPENAI_API_KEY_1||process.env.OPENAI_API_KEY;
if(!key)throw Error('Configured credentials required.');
(async()=>{
 const body={model:'gpt-6.1-sol',temperature:0.2,seed:12345,messages:[{role:'user',content:'Return the word OK.'}]};
 for(let i=0;i<3;i++){
  const start=Date.now(),response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify(body)}),data=await response.json();
  console.log(JSON.stringify({status:response.status,ms:Date.now()-start,param:data.error?.param,code:data.error?.code,model:data.model,finish:data.choices?.[0]?.finish_reason}));
  if(response.ok)break;
  if(data.error?.param==='temperature'||data.error?.param==='seed')delete body[data.error.param];else break;
 }
})().catch(()=>{console.error('Compatibility probe failed.');process.exitCode=1;});
