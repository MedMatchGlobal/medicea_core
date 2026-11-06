import {playEnabled,syncKnownPlay} from '@/lib/membership/play';
import {verifyRtdn} from '@/lib/membership/play-api';
import {PLAY_PACKAGE,playToken} from '@/lib/membership/play-policy';
export const maxDuration=60;
export async function POST(req:Request){
 if(!playEnabled())return new Response(null,{status:404});
 try{await verifyRtdn(req);}catch{return new Response(null,{status:401});}
 try{
  const raw=await req.text();if(raw.length>20000)return new Response(null,{status:413});
  const envelope=JSON.parse(raw),data=JSON.parse(Buffer.from(envelope.message?.data||'','base64').toString());
  if(data.packageName!==PLAY_PACKAGE)return new Response(null,{status:400});
  if(data.testNotification)return new Response(null,{status:204});
  const notice=data.subscriptionNotification||data.oneTimeProductNotification||data.voidedPurchaseNotification;
  if(!notice)return new Response(null,{status:400});
  await syncKnownPlay(playToken(notice.purchaseToken),!!data.voidedPurchaseNotification,notice.orderId);
  return new Response(null,{status:204});
 }catch{return new Response(null,{status:503});} // Pub/Sub retries; never log tokens.
}
