'use server';
import { revalidatePath } from 'next/cache';
import { vaultAccess } from '@/lib/vault-access';
import { documentTitle, documentType, MAX_FILE_BYTES, VAULT_BUCKET, validDocumentId } from '@/lib/vault-files';
import { privateObject } from '@/lib/vault-storage';

export type VaultResult = { error?: string; success?: string };
export async function beginDocument(input: {title:string;size:number;mime:string;fictional:boolean}) {
  const access = await vaultAccess();
  if (!access.ok) return {error:'Sign in and verify your authenticator before using the beta vault.'};
  const title=documentTitle(input.title);
  if (!input.fictional) return {error:'Confirm that this is a fictional test document.'};
  if (!title) return {error:'Enter a title between 1 and 120 characters.'};
  if (!Number.isSafeInteger(input.size) || input.size<1 || input.size>MAX_FILE_BYTES || !['application/pdf','image/jpeg','image/png'].includes(input.mime)) return {error:'Choose a PDF, JPEG or PNG up to 50 MB.'};
  const expired=await access.client.from('vault_beta_uploads').select('id,expires_at,cancelled').eq('user_id',access.user.id).limit(3);
  for (const item of expired.data ?? []) if (item.cancelled || new Date(item.expires_at).getTime()<=Date.now()) await cancelDocument(item.id);
  const result=await access.client.rpc('vault_begin_upload',{p_title:title,p_size:input.size,p_mime:input.mime});
  if (result.error || !result.data) return {error:'Upload failed. Check that beta storage is configured, then try again.'};
  return {intake:result.data as {id:string;object_path:string;user_id:string;mime_type:string}};
}
export async function finishDocument(id:string):Promise<VaultResult> {
  const access=await vaultAccess();
  if (!access.ok || !validDocumentId(id)) return {error:'Sign in and verify your authenticator before using the beta vault.'};
  const found=await access.client.from('vault_beta_uploads').select('*').eq('id',id).eq('user_id',access.user.id).maybeSingle();
  if(!found.error && !found.data) {
    const saved=await access.client.from('vault_beta_documents').select('id').eq('id',id).eq('user_id',access.user.id).maybeSingle();
    if(saved.data && !saved.error) {revalidatePath('/vault');return {success:'Test document saved to your private beta vault.'};}
  }
  if (found.error || !found.data || new Date(found.data.expires_at).getTime()<=Date.now()) return {error:'The document could not be registered. Please try again.'};
  const intake=found.data;
  const info=await access.client.storage.from(VAULT_BUCKET).info(intake.object_path);
  if (info.error || info.data?.size!==intake.size_bytes || info.data?.contentType!==intake.mime_type) return {error:'The document could not be registered. Please try again.'};
  const response=await privateObject(access.client,intake.object_path,'bytes=0-15');
  if (response.status!==206) {await response.body?.cancel();return {error:'The document could not be registered. Please try again.'};}
  const bytes=new Uint8Array(await response.arrayBuffer());
  if (documentType(bytes)?.mime!==intake.mime_type) return {error:'The file must be a PDF, JPEG or PNG. Renaming a file is not enough.'};
  const result=await access.client.rpc('vault_finish_upload',{p_id:id});
  if (result.error) return {error:'The document could not be registered. Please try again.'};
  revalidatePath('/vault');return {success:'Test document saved to your private beta vault.'};
}
export async function cancelDocument(id:string):Promise<VaultResult> {
  const access=await vaultAccess();
  if (!access.ok || !validDocumentId(id)) return {error:'Sign in and verify your authenticator before using the beta vault.'};
  const found=await access.client.from('vault_beta_uploads').select('object_path').eq('id',id).eq('user_id',access.user.id).maybeSingle();
  if (!found.data || found.error) return {error:'This document is unavailable.'};
  const cancelled=await access.client.rpc('vault_cancel_upload',{p_id:id});
  if (cancelled.error) return {error:'The file could not be deleted. Please try again.'};
  const removed=await access.client.storage.from(VAULT_BUCKET).remove([found.data.object_path]);
  if (removed.error) return {error:'The file could not be deleted. Please try again.'};
  await access.client.rpc('vault_cancel_upload',{p_id:id,p_release:true});
  return {success:'Test document deleted.'};
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
