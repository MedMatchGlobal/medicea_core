import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function authConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

export async function accountClient(recoveryCodes = false) {
  if (!authConfigured()) throw new Error('Account service is not configured');
  const jar = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: {experimental: {recoveryCodes}},
    cookies: {
      getAll: () => jar.getAll(),
      setAll(values) {
        try { values.forEach(({name, value, options}) => jar.set(name, value, options)); }
        catch { /* Server components cannot write cookies; middleware refreshes them. */ }
      },
    },
  });
}
