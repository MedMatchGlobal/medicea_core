import type { SupabaseClient } from '@supabase/supabase-js';
import { VAULT_BUCKET } from './vault-files';

// No signed URLs: storage verifies the user's token and RLS on every request.
export async function privateObject(client: SupabaseClient, path: string, range?: string, signal?: AbortSignal) {
  const {data:{session}} = await client.auth.getSession();
  if (!session) throw new Error('Session unavailable');
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL!}/storage/v1/object/authenticated/${VAULT_BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`;
  return fetch(url, {cache:'no-store', redirect:'error', signal,
    headers:{Authorization:`Bearer ${session.access_token}`, apikey:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, ...(range?{Range:range}:{})}});
}
