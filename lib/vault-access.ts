import { accountClient, authConfigured } from './supabase/server';

export const vaultEnabled = () => process.env.MEDICEA_VAULT_BETA_ENABLED === 'true';
export async function vaultAccess() {
  if (!vaultEnabled() || !authConfigured()) return { ok: false as const, reason: 'disabled' as const };
  const client = await accountClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return { ok: false as const, reason: 'signin' as const };
  const assurance = await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assurance.error || assurance.data?.currentLevel !== 'aal2') {
    return { ok: false as const, reason: 'mfa' as const };
  }
  return { ok: true as const, client, user };
}
