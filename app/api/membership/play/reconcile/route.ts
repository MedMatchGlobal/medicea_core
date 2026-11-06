import {timingSafeEqual} from 'node:crypto';
import {playEnabled,syncKnownPlay,backfillVoidedPlay} from '@/lib/membership/play';
import {billingDb} from '@/lib/membership/store';
export const maxDuration=300;
export async function POST(req:Request){
 if(!playEnabled())return new Response(null,{status:404});
 const secret=process.env.GOOGLE_PLAY_RECONCILE_SECRET,auth=req.headers.get('authorization')||'';
 const supplied=Buffer.from(auth),expected=Buffer.from('Bearer '+secret);
 if(!secret||secret.length<32||supplied.length!==expected.length||!timingSafeEqual(supplied,expected))return new Response(null,{status:401});
 try{
  const moreVoidedPages=await backfillVoidedPlay();
  // Bounded, oldest first; repeated calls drain backlog without holding a cursor.
  const rows=await billingDb().$queryRaw<Array<{token:string}>>`SELECT token FROM medicea_billing.play_purchase WHERE NOT superseded AND NOT revoked AND verified_at<now()-interval '5 minutes' ORDER BY verified_at LIMIT 10`;
  let failed=0;for(const row of rows){try{await syncKnownPlay(row.token);}catch{failed++;}}
  return Response.json({checked:rows.length,failed,moreVoidedPages},{status:failed?503:200});
 }catch{return new Response(null,{status:503});}
}
