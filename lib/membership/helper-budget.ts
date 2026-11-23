import {billingDb} from './store';
export async function consumeHelperBudget(member:string,chars:number):Promise<{allowed:boolean;retryAfter?:number}>{
 const rows=await billingDb().$queryRaw<Array<{result:{allowed:boolean;retryAfter?:number}}>>`
  SELECT medicea_billing.consume_helper_budget(${member}::uuid,${chars}::integer) AS result`;
 if(typeof rows[0]?.result?.allowed!=='boolean')throw Error('HELPER_BUDGET_UNAVAILABLE');
 return rows[0].result;
}
