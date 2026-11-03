import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
export async function membershipAuth(readOnly = false) {
  const jar = await cookies();
  const url = process.env.MEDICEA_MEMBERSHIP_AUTH_URL;
  const key = process.env.MEDICEA_MEMBERSHIP_AUTH_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Membership auth is not configured');
  return createServerClient(url, key, { cookieOptions: { name: 'medicea-membership', sameSite: 'lax', secure: process.env.NODE_ENV !== 'development', httpOnly: true }, cookies: {
    getAll: () => jar.getAll(),
    // Server Components cannot persist refreshed cookies; route handlers can.
    setAll: values => { if (!readOnly) values.forEach(({name, value, options}) => jar.set(name, value, options)); },
  }});
}
export async function membershipUser(readOnly = false) {
  const client = await membershipAuth(readOnly);
  const {data, error} = await client.auth.getUser();
  if (error || !data.user) return null;
  return {id: data.user.id, email: data.user.email_confirmed_at ? data.user.email : undefined};
}
