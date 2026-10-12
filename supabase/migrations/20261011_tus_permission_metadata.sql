-- Correct TUS authorization metadata; apply once in a NEW SQL Editor query.
-- No documents or stored objects are deleted. Ownership/MFA guards remain.
begin;
drop policy vault_beta_reserved_insert on storage.objects;
create policy vault_beta_reserved_insert on storage.objects as restrictive for insert to authenticated
 with check(bucket_id<>'medicea-vault-beta' or exists(
 select 1 from public.vault_beta_uploads u where u.object_path=name and u.user_id=auth.uid()
 and not u.cancelled and u.expires_at>now()
 -- TUS preflight uses contentLength; committed storage metadata uses size.
 -- Prefer actual size if both are supplied. Missing size information fails closed.
 and coalesce(metadata->>'size',metadata->>'contentLength')::bigint=u.size_bytes
 and metadata->>'mimetype'=u.mime_type));
commit;
