'use server';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { accountClient, authConfigured } from '@/lib/supabase/server';
import { vaultEnabled } from '@/lib/vault-access';
import { VAULT_BUCKET } from '@/lib/vault-files';

const dummy = Buffer.from('%PDF-1.4\n% Fictional disposable storage security probe; no personal data.\n%%EOF\n');
const pathPattern = /^[0-9a-f-]{36}\/security-check-[0-9a-f-]{36}\.pdf$/;
function enabled() {
  if (process.env.NODE_ENV !== 'development' || !vaultEnabled() || !authConfigured()) throw new Error('Local test unavailable');
}
function rejection(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const value = error as {status?:number;statusCode?:string|number};
  const status = Number(value.statusCode || value.status);
  return [400,401,403,404].includes(status);
}
export async function prepareStorageProbe() {
  enabled();
  const client = await accountClient();
  const identity = await client.auth.getUser();
  const assurance = await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if (identity.error || !identity.data.user || assurance.error || assurance.data?.currentLevel !== 'aal2') return {error:'Sign in and verify your authenticator first.'};
  const path = `${identity.data.user.id}/security-check-${randomUUID()}.pdf`;
  const result = await client.storage.from(VAULT_BUCKET).upload(path,dummy,{contentType:'application/pdf',upsert:false});
  return result.error ? {error:'Could not create the disposable probe.'} : {path};
}
export async function runStorageProbe(path:string, anonymous:boolean) {
  enabled();
  if (!pathPattern.test(path)) return {error:'Paste the disposable test path created by this page.'};
  const client = anonymous ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}) : await accountClient();
  let canAccess = false;
  if (!anonymous) {
    const identity = await client.auth.getUser();
    if (identity.error || !identity.data.user) return {error:'Sign in first, or choose the anonymous test.'};
    const assurance = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assurance.error) return {error:'Could not verify the session assurance level.'};
    canAccess = identity.data.user.id === path.split('/')[0] && assurance.data?.currentLevel === 'aal2';
  }
  const rows: {check:string;result:string}[] = [];
  const storage = client.storage.from(VAULT_BUCKET);
  const download = await storage.download(path);
  if (canAccess && (download.error || !download.data)) return {error:'Owner baseline failed: disposable file could not be downloaded. Prepare a new probe and retry.'};
  rows.push({check:'Direct download',result:canAccess ? 'PASS' : download.data ? 'FAIL: file accessible' : rejection(download.error) ? 'PASS' : 'INCONCLUSIVE: service error'});
  const [folder,name] = path.split('/');
  const listing = await storage.list(folder,{search:name,limit:100});
  const visible = listing.data?.some(item=>item.name===name) || false;
  rows.push({check:'Direct file listing',result:listing.error ? rejection(listing.error)&&!canAccess ? 'PASS' : 'INCONCLUSIVE: service error' : visible===canAccess ? 'PASS' : 'FAIL: unexpected visibility'});
  const alternate = `${folder}/security-check-${randomUUID()}.pdf`;
  const upload = await storage.upload(alternate,dummy,{contentType:'application/pdf',upsert:false});
  rows.push({check:'Upload into target owner folder',result:upload.error ? canAccess ? 'FAIL: owner upload rejected' : rejection(upload.error) ? 'PASS' : 'INCONCLUSIVE: service error' : canAccess ? 'PASS' : 'FAIL: unauthorized upload allowed'});
  if (!upload.error) {
    const cleanup = await storage.remove([alternate]);
    rows.push({check:'Delete newly uploaded disposable file',result:cleanup.error ? 'FAIL: cleanup error' : cleanup.data?.some(item=>item.name===alternate || item.name===alternate.split('/')[1]) ? canAccess ? 'PASS' : 'FAIL: unauthorized deletion allowed' : 'FAIL: disposable file cleanup unconfirmed'});
    if (cleanup.error || !cleanup.data?.length) rows.push({check:`Cleanup required: ${alternate}`,result:'MANUAL CLEANUP REQUIRED'});
  }
  const overwrite = await storage.upload(path,dummy,{contentType:'application/pdf',upsert:true});
  rows.push({check:'Overwrite existing disposable file (blocked for everyone)',result:overwrite.error ? rejection(overwrite.error) ? 'PASS' : 'INCONCLUSIVE: service error' : 'FAIL: overwrite allowed'});
  if (!canAccess) {
    const removal = await storage.remove([path]);
    rows.push({check:'Delete target disposable file (must be blocked)',result:removal.error ? rejection(removal.error) ? 'PASS' : 'INCONCLUSIVE: service error' : removal.data?.length ? 'FAIL: unauthorized deletion allowed' : 'PASS'});
  }
  return {rows,session:anonymous?'Anonymous':canAccess?'Owner with MFA':'Other account or session without MFA'};
}
export async function cleanupStorageProbe(path:string) {
  enabled();
  if (!pathPattern.test(path)) return {error:'Invalid disposable path.'};
  const client = await accountClient();
  const identity = await client.auth.getUser();
  const assurance = await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if (identity.error || !identity.data.user || identity.data.user.id !== path.split('/')[0] || assurance.error || assurance.data?.currentLevel !== 'aal2') return {error:'Use the owner account with authenticator verification to clean up.'};
  const removed = await client.storage.from(VAULT_BUCKET).remove([path]);
  if (removed.error) return {error:'Cleanup failed.'};
  const listing = await client.storage.from(VAULT_BUCKET).list(path.split('/')[0],{search:path.split('/')[1],limit:100});
  return listing.error || listing.data?.some(item=>item.name===path.split('/')[1]) ? {error:'Cleanup could not be confirmed.'} : {success:'Disposable probe removed.'};
}
