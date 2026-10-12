import { PrismaClient } from '@prisma/client';
// A separate billing database; never falls back to the medical-record database.
let client: PrismaClient | undefined;
export function billingDb() {
  const url = process.env.MEDICEA_BILLING_DATABASE_URL;
  if (!url) throw new Error('Billing database is not configured');
  return client ||= new PrismaClient({datasources: {db: {url}}, log: ['error']});
}
export async function reserve(user: string, requestId: string) {
  const rows = await billingDb().$queryRaw<Array<{result: {allowed:boolean; reason:string; id?:string}}>>`
    SELECT medicea_billing.reserve_search(${user}::uuid, ${requestId}::uuid) AS result`;
  return rows[0].result;
}
export async function finish(user: string, requestId: string, success: boolean) {
  await billingDb().$queryRaw`SELECT medicea_billing.finish_search(${user}::uuid, ${requestId}::uuid, ${success}::boolean)`;
}
export async function membershipStatus(user: string) {
  const rows = await billingDb().$queryRaw<Array<{result: {used:number; reserved:number; limit:number; premium:boolean; resetsAt:string}}>>`
    SELECT medicea_billing.member_status(${user}::uuid) AS result`;
  return rows[0].result;
}
