// Anthropic SSE transport. Only public answer text reaches the caller: thinking,
// signatures and tool inputs are never forwarded to the leaflet renderer.
export async function readClaudeTextStream(response:Response,onText?:(text:string,sources:string[])=>void){
 if(!response.body)throw Error('CLAUDE_EMPTY_STREAM');
 const reader=response.body.getReader(),decoder=new TextDecoder();
 let buffer='',text='',model='',stopReason='',stopped=false,usage:Record<string,unknown>={};
 const sources=new Set<string>();
 const add=(url:unknown)=>{if(typeof url==='string'&&/^https:\/\//.test(url))sources.add(url);};
 const consume=(frame:string)=>{
  const data=frame.split('\n').filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trimStart()).join('\n');
  if(!data)return;
  const event=JSON.parse(data);
  if(event.type==='error')throw Error('CLAUDE_STREAM_ERROR');
  if(event.type==='message_start'){model=event.message?.model||'';usage={...event.message?.usage};}
  if(event.type==='content_block_start'){
   const block=event.content_block;
   if(block?.type==='text'&&typeof block.text==='string'&&block.text){text+=block.text;onText?.(text,[...sources]);}
   if(block?.type==='web_search_tool_result'&&Array.isArray(block.content))for(const result of block.content)add(result.url);
   if(Array.isArray(block?.citations))for(const citation of block.citations)add(citation.url);
  }
  if(event.type==='content_block_delta'){
   if(event.delta?.type==='text_delta'){text+=event.delta.text||'';onText?.(text,[...sources]);}
   if(event.delta?.type==='citations_delta')add(event.delta.citation?.url);
  }
  if(event.type==='message_delta'){stopReason=event.delta?.stop_reason||stopReason;usage={...usage,...event.usage};}
  if(event.type==='message_stop')stopped=true;
 };
 try{
  while(true){const chunk=await reader.read();if(chunk.done)break;buffer+=decoder.decode(chunk.value,{stream:true});buffer=buffer.replace(/\r\n/g,'\n');
   let split;while((split=buffer.indexOf('\n\n'))>=0){consume(buffer.slice(0,split));buffer=buffer.slice(split+2);}
  }
  buffer+=decoder.decode();if(buffer.trim())consume(buffer);
  if(!stopped||stopReason!=='end_turn')throw Error('CLAUDE_INCOMPLETE');
  if(!text.trim())throw Error('CLAUDE_EMPTY_RESPONSE');
  return {text,model,usage,sources:[...sources]};
 }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
