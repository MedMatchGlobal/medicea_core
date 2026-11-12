import {claudeMessage,claudePreviewEnabled} from './claude-preview';

// Owner-requested comparison fixture. One public query, no arbitrary prompt
// endpoint and no connection to the validated medicine-result pipeline.
export const bareEquivalentPrompt='List me all equivalents in the UK to the Italian Co-Efferalgan 500mg + 30mg compresse rivestite con film';

export async function bareEquivalentSearch(req:Request):Promise<Response>{
 if(!claudePreviewEnabled())return Response.json({error:'NOT_FOUND'},{status:404});
 if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'INVALID_ORIGIN'},{status:403});
 const started=Date.now();
 try{
  // Empty system string omits the system field entirely. No claudeResearch,
  // readClaudeResearch, JSON schema, product parser, second call or comparator.
  const payload=await claudeMessage('',[{role:'user',content:bareEquivalentPrompt}],true,Date.now()+50_000,8000,req.signal);
  const blocks=payload.content.filter((block:any)=>block.type==='text');
  return Response.json({prompt:bareEquivalentPrompt,response:blocks.map((block:any)=>block.text).join('\n\n'),textBlocks:blocks,model:payload.model,usage:payload.usage,elapsedMs:Date.now()-started},{headers:{'Cache-Control':'no-store'}});
 }catch{
  return Response.json({error:'BARE_SEARCH_UNAVAILABLE',elapsedMs:Date.now()-started},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
