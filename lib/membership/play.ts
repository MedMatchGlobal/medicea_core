import {billingDb} from './store';
import {PLAY_PLANS,playAccount,playToken,playAccess,type PlayPlan} from './play-policy';
import {playRequest,purchasePath,fulfillmentPath} from './play-api';
import {membershipPreviewEnabled} from './config';
export function playEnabled(){return membershipPreviewEnabled()&&process.env.MEDICEA_GOOGLE_PLAY_TEST==='true';}
// Caller identity comes from verified auth, never from request JSON. Tokens stay server-only.
export async function syncPlay(member:string,plan:PlayPlan,rawToken:unknown){
 if(!playEnabled())throw Error('Play disabled');
 const token=playToken(rawToken);if(!PLAY_PLANS[plan])throw Error('Invalid plan');
 const outcome=await billingDb().$transaction(async tx=>{
  // Serialize verification + linked-token replacement, including first-use token races.
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(72349210)::text`;
  const rows=await tx.$queryRaw<Array<{member_id:string;plan:string;superseded:boolean;revoked:boolean;voided_order_id:string|null}>>`SELECT member_id,plan,superseded,revoked,voided_order_id FROM medicea_billing.play_purchase WHERE token=${token}`;
  const old=rows[0];if(old&&(old.member_id!==member||old.plan!==plan))throw Error('Purchase belongs to another account or plan');
  if(old?.superseded||(old?.revoked&&PLAY_PLANS[plan].type==='inapp'))return {active:false,action:null};
  const provider=await playRequest(purchasePath(plan,token));
  const access=playAccess(plan,provider,playAccount(member));
  if(old?.revoked){
   const order=provider.lineItems?.[0]?.latestSuccessfulOrderId||provider.latestOrderId;
   if(!order||order===old.voided_order_id)return {active:false,action:null};
   // A later paid subscription renewal can share the same token. Never let an
   // old refunded order permanently block a new verified paid period.
   await tx.$executeRaw`UPDATE medicea_billing.play_purchase SET revoked=false,voided_order_id=NULL WHERE token=${token}`;
  }
  if(access.linked){
   if(access.linked===token)throw Error('Invalid linked purchase');
   const linked=await tx.$queryRaw<Array<{member_id:string}>>`SELECT member_id FROM medicea_billing.play_purchase WHERE token=${access.linked}`;
   if(linked.length&&linked[0].member_id!==member)throw Error('Linked purchase belongs to another account');
   // Retain a tombstone so restoring the old token cannot resurrect access.
   await tx.$executeRaw`INSERT INTO medicea_billing.play_purchase(token,member_id,plan,superseded) VALUES(${access.linked},${member}::uuid,${plan},true) ON CONFLICT(token) DO UPDATE SET superseded=true`;
   await tx.$executeRaw`UPDATE medicea_billing.entitlement SET active=false WHERE provider='google_play' AND external_id=${access.linked}`;
  }
  await tx.$executeRaw`INSERT INTO medicea_billing.play_purchase(token,member_id,plan) VALUES(${token},${member}::uuid,${plan}) ON CONFLICT(token) DO UPDATE SET verified_at=now()`;
  // Short server lease fails closed if notifications/reconciliation stop. Pass start
  // is always Google's purchase time; replay never extends its actual duration.
  const lease=new Date(Math.min(access.until.getTime(),Date.now()+15*60000));
  await tx.$executeRaw`INSERT INTO medicea_billing.entitlement(provider,external_id,member_id,active,valid_until) VALUES('google_play',${token},${member}::uuid,${access.active},${lease}) ON CONFLICT(provider,external_id) DO UPDATE SET active=excluded.active,valid_until=excluded.valid_until`;
  return {active:access.active,action:access.fulfill};
 },{timeout:60000});
 // Durable entitlement precedes consumption. A failed acknowledgement is retried
 // from the stored token by restore, RTDN or the reconciliation job.
 if(outcome.action){await playRequest(fulfillmentPath(plan,token,outcome.action),'POST');await billingDb().$executeRaw`UPDATE medicea_billing.play_purchase SET fulfilled=true WHERE token=${token}`;}
 return {active:outcome.active};
}
export async function syncKnownPlay(token:string,voided=false,orderId?:string){
 const rows=await billingDb().$queryRaw<Array<{member_id:string;plan:PlayPlan}>>`SELECT member_id,plan FROM medicea_billing.play_purchase WHERE token=${token}`;
 if(!rows.length)return; // Unclaimed purchases are recovered by signed-in restore.
 if(voided){
  await billingDb().$transaction(async tx=>{
   await tx.$queryRaw`SELECT pg_advisory_xact_lock(72349210)::text`;
   if(PLAY_PLANS[rows[0].plan].type==='subs'){
    if(!orderId)throw Error('Voided subscription order required');
    const provider=await playRequest(purchasePath(rows[0].plan,token));
    const current=provider.lineItems?.[0]?.latestSuccessfulOrderId||provider.latestOrderId;
    if(!current)throw Error('Current subscription order unavailable');
    if(current!==orderId)return; // A historical refund must not revoke a newer paid order.
   }
   await tx.$executeRaw`UPDATE medicea_billing.play_purchase SET revoked=true,voided_order_id=${orderId||null} WHERE token=${token}`;
   await tx.$executeRaw`UPDATE medicea_billing.entitlement SET active=false WHERE provider='google_play' AND external_id=${token}`;
  });return;
 }
 await syncPlay(rows[0].member_id,rows[0].plan,token);
}
export async function backfillVoidedPlay(){
 // Google exposes only a bounded history (normally 30 days). Persist pagination;
 // advance after revocations so a crash safely replays the page.
 const rows=await billingDb().$queryRaw<Array<{page_token:string}>>`SELECT page_token FROM medicea_billing.play_reconcile_cursor WHERE id=1`;
 const cursor=rows[0]?.page_token||'';
 const query=new URLSearchParams({type:'1','pageSelection.maxResults':'100',includeQuantityBasedPartialRefund:'true'});if(cursor)query.set('pageSelection.token',cursor);
 const page=await playRequest('/purchases/voidedpurchases?'+query);
 for(const p of page.voidedPurchases||[])await syncKnownPlay(playToken(p.purchaseToken),true,p.orderId);
 const next=page.tokenPagination?.nextPageToken||'';
 await billingDb().$executeRaw`UPDATE medicea_billing.play_reconcile_cursor SET page_token=${next} WHERE id=1 AND page_token=${cursor}`;
 return !!next;
}
