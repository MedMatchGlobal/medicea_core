import { healthServerText } from '@/app/health-i18n/server';
import { privateObject } from '@/lib/vault-storage';
import { vaultAccess } from '@/lib/vault-access';
import { validDocumentId } from '@/lib/vault-files';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' };
export async function GET(_request: Request, {params}:{params:Promise<{id:string}>}) {
  const access = await vaultAccess();
  if (!access.ok) return new Response(await healthServerText('Sign in and verify your authenticator.'), {status:403, headers});
  const {id} = await params;
  if (!validDocumentId(id)) return new Response(await healthServerText('Document unavailable.'), {status:404, headers});
  const result = await access.client.from('vault_beta_documents').select('object_path,mime_type').eq('id',id).eq('user_id',access.user.id).maybeSingle();
  if (result.error || !result.data) return new Response(await healthServerText('Document unavailable.'), {status:404, headers});
  const file = await privateObject(access.client, result.data.object_path, undefined, _request.signal);
  if (!file.ok || !file.body) return new Response(await healthServerText('Document unavailable.'), {status:404, headers});
  const extension = result.data.mime_type === 'application/pdf' ? 'pdf' : result.data.mime_type === 'image/png' ? 'png' : 'jpg';
  return new Response(file.body, { headers: {...headers, 'Content-Type': result.data.mime_type, 'Content-Disposition': `attachment; filename="document-${id}.${extension}"`, 'Content-Security-Policy': "default-src 'none'; sandbox"} });
}
