import {billingDb} from './store';
import {stripeRequest} from './stripe';
import {processStripeEvent,stripeEventTypes} from './stripe-events';
export async function backfillStripeEvents(){
 return billingDb().$transaction(async tx=>{
  await tx.$executeRaw`INSERT INTO medicea_billing.stripe_event_checkpoint(singleton) VALUES(true) ON CONFLICT DO NOTHING`;
  const rows=await tx.$queryRaw<Array<{through_time:bigint;scan_after:bigint|null;scan_before:bigint|null;cursor:string|null}>>`SELECT through_time,scan_after,scan_before,cursor FROM medicea_billing.stripe_event_checkpoint WHERE singleton=true FOR UPDATE SKIP LOCKED`;
  if(!rows.length)return {busy:true,checked:0,more:true};
  const state=rows[0],now=Math.floor(Date.now()/1000),before=Number(state.scan_before??now),after=Number(state.scan_after??Math.max(Number(state.through_time)-300,now-30*86400));
  const query=new URLSearchParams({limit:'10','created[gte]':String(after),'created[lte]':String(before)});
  stripeEventTypes.forEach((type,i)=>query.set(`types[${i}]`,type));
  if(state.cursor)query.set('starting_after',state.cursor);
  const events=await stripeRequest('/events',undefined,undefined,15000,undefined,query);
  if(!Array.isArray(events.data))throw Error('Invalid event history');
  for(const event of events.data){
   if(event.livemode!==false||!/^evt_[a-zA-Z0-9]+$/.test(event.id)||!Number.isSafeInteger(event.created)||event.created<after||event.created>before)throw Error('Unexpected event history');
   const response=await processStripeEvent(event);if(!response.ok)throw Error('Stripe event recovery failed');
  }
  const more=events.has_more===true,cursor=more?events.data.at(-1)?.id:null;
  if(more&&!/^evt_[a-zA-Z0-9]+$/.test(cursor))throw Error('Invalid replay cursor');
  await tx.$executeRaw`UPDATE medicea_billing.stripe_event_checkpoint SET through_time=${more?Number(state.through_time):before},scan_after=${more?after:null},scan_before=${more?before:null},cursor=${cursor} WHERE singleton=true`;
  return {busy:false,checked:events.data.length,more};
 },{timeout:240000});
}
