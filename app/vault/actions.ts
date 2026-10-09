'use server';
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { vaultAccess } from '@/lib/vault-access';
import { documentTitle, documentType, MAX_FILE_BYTES, VAULT_BUCKET, validDocumentId } from '@/lib/vault-files';

export type VaultResult = { error?: string; success?: string };
export async function uploadDocument(form: FormData): Promise<VaultResult> {
  const access = await vaultAccess();
  if (!access.ok) return { error: 'Sign in and verify your authenticator before using the beta vault.' };
  if (form.get('fictional') !== 'yes') return { error: 'Confirm that this is a fictional test document.' };
  const title = documentTitle(form.get('title'));
  const file = form.get('document');
  if (!title) return { error: 'Enter a title between 1 and 120 characters.' };
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_FILE_BYTES) return { error: 'Choose a PDF, JPEG or PNG up to 3 MB.' };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = documentType(bytes);
  if (!type) return { error: 'The file must be a PDF, JPEG or PNG. Renaming a file is not enough.' };
  const id = randomUUID();
  const path = `${access.user.id}/${id}.${type.extension}`;
  const storage = access.client.storage.from(VAULT_BUCKET);
  const uploaded = await storage.upload(path, bytes, { contentType: type.mime, upsert: false });
  if (uploaded.error) return { error: 'Upload failed. Check that beta storage is configured, then try again.' };
  const inserted = await access.client.from('vault_beta_documents').insert({ id, user_id: access.user.id, title, object_path: path, mime_type: type.mime, size_bytes: file.size });
  if (inserted.error) {
    await storage.remove([path]);
    return { error: 'The document could not be registered. Please try again.' };
  }
  revalidatePath('/vault');
  return { success: 'Test document saved to your private beta vault.' };
}

export async function deleteDocument(id: string): Promise<VaultResult> {
  const access = await vaultAccess();
  if (!access.ok || !validDocumentId(id)) return { error: 'Sign in and verify your authenticator before deleting a document.' };
  const selected = await access.client.from('vault_beta_documents').select('object_path').eq('id', id).eq('user_id', access.user.id).maybeSingle();
  if (selected.error || !selected.data) return { error: 'This document is unavailable.' };
  const removed = await access.client.storage.from(VAULT_BUCKET).remove([selected.data.object_path]);
  if (removed.error) return { error: 'The file could not be deleted. Please try again.' };
  const deleted = await access.client.from('vault_beta_documents').delete().eq('id', id).eq('user_id', access.user.id);
  if (deleted.error) return { error: 'The file was removed, but its listing could not be removed. Retry deletion.' };
  revalidatePath('/vault');
  return { success: 'Test document deleted.' };
}
