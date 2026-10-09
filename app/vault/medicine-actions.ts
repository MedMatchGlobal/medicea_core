'use server';
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { vaultAccess } from '@/lib/vault-access';
import { validDocumentId } from '@/lib/vault-files';
import { medicineText } from '@/lib/vault-medicines';
import type { VaultResult } from './actions';

export async function saveMedicine(form: FormData): Promise<VaultResult> {
  const access = await vaultAccess();
  if (!access.ok) return { error: 'Sign in and verify your authenticator before saving medicines.' };
  if (form.get('fictional') !== 'yes') return { error: 'Use fictional test medicines only during this beta.' };
  const name = medicineText(form.get('name'), 120, true);
  const strength = medicineText(form.get('strength'), 80);
  const notes = medicineText(form.get('notes'), 500);
  if (name === null || strength === null || notes === null) return { error: 'Check the medicine name, strength and notes. The name is required; notes can contain up to 500 characters.' };
  const result = await access.client.from('vault_beta_medicines').insert({ id: randomUUID(), user_id: access.user.id, name, strength, notes });
  if (result.error) return { error: 'The medicine could not be saved. Please try again after private storage setup.' };
  revalidatePath('/vault');
  return { success: 'Test medicine saved.' };
}

export async function removeMedicine(id: string): Promise<VaultResult> {
  const access = await vaultAccess();
  if (!access.ok || !validDocumentId(id)) return { error: 'Sign in and verify your authenticator before removing a medicine.' };
  const result = await access.client.from('vault_beta_medicines').delete().eq('id', id).eq('user_id', access.user.id).select('id');
  if (result.error || !result.data?.length) return { error: 'This medicine is unavailable or could not be removed.' };
  revalidatePath('/vault');
  return { success: 'Test medicine removed.' };
}
