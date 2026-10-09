-- PREVIEW ONLY. Apply after reviewing; no existing records or objects are deleted.
-- 50 decimal MB matches the Free-plan global cap. Originals remain private.
begin;
create table if not exists public.vault_beta_uploads (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id),
 title text not null check(char_length(title) between 1 and 120),
 size_bytes bigint not null check(size_bytes between 1 and 50000000),
 mime_type text not null check(mime_type in ('application/pdf','image/jpeg','image/png')),
 object_path text not null unique,
 expires_at timestamptz not null default now()+interval '1 hour',
 cancelled boolean not null default false
);
alter table public.vault_beta_uploads enable row level security;
alter table public.vault_beta_uploads force row level security;
revoke all on public.vault_beta_uploads from anon, authenticated;
grant select on public.vault_beta_uploads to authenticated;
create policy vault_upload_owner_read on public.vault_beta_uploads for select to authenticated
 using(user_id=auth.uid() and auth.jwt()->>'aal'='aal2');

create or replace function public.vault_begin_upload(p_title text,p_size bigint,p_mime text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_id uuid:=gen_random_uuid(); v_path text; v_total bigint;
begin
 if v_uid is null or auth.jwt()->>'aal' is distinct from 'aal2' then raise exception 'MFA required'; end if;
 if p_title is null or char_length(trim(p_title)) not between 1 and 120 or p_title ~ '[[:cntrl:]]'
 or p_size is null or p_size not between 1 and 50000000
 or p_mime is null or p_mime not in ('application/pdf','image/jpeg','image/png') then raise exception 'Invalid upload'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_uid::text,0));
 if (select count(*) from public.vault_beta_uploads where user_id=v_uid)>=3 then raise exception 'Pending upload limit'; end if;
 if (select count(*) from public.vault_beta_documents where user_id=v_uid)+(select count(*) from public.vault_beta_uploads where user_id=v_uid)>=100 then raise exception 'Document count limit'; end if;
 select coalesce(sum(size_bytes),0) into v_total from (
 select size_bytes from public.vault_beta_documents where user_id=v_uid
 union all select size_bytes from public.vault_beta_uploads where user_id=v_uid) q;
 if v_total+p_size>250000000 then raise exception 'Preview quota'; end if;
 v_path:=v_uid::text||'/'||v_id::text||case p_mime when 'application/pdf' then '.pdf' when 'image/png' then '.png' else '.jpg' end;
 insert into public.vault_beta_uploads(id,user_id,title,size_bytes,mime_type,object_path)
 values(v_id,v_uid,trim(p_title),p_size,p_mime,v_path);
 return jsonb_build_object('id',v_id,'user_id',v_uid,'object_path',v_path,'mime_type',p_mime);
end $$;

create or replace function public.vault_finish_upload(p_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v public.vault_beta_uploads; o storage.objects;
begin
 if v_uid is null or auth.jwt()->>'aal' is distinct from 'aal2' then raise exception 'MFA required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_uid::text,0));
 select * into v from public.vault_beta_uploads where id=p_id and user_id=v_uid for update;
 if not found then
  if exists(select 1 from public.vault_beta_documents where id=p_id and user_id=v_uid) then return; end if;
  raise exception 'Unavailable upload';
 end if;
 if v.cancelled or v.expires_at<=now() then raise exception 'Expired upload'; end if;
 select * into o from storage.objects where bucket_id='medicea-vault-beta' and name=v.object_path and owner_id=v_uid::text;
 if not found or (o.metadata->>'size')::bigint is distinct from v.size_bytes
 or o.metadata->>'mimetype' is distinct from v.mime_type then raise exception 'Incomplete or mismatched object'; end if;
 insert into public.vault_beta_documents(id,user_id,title,object_path,mime_type,size_bytes)
 values(v.id,v_uid,v.title,v.object_path,v.mime_type,v.size_bytes);
 delete from public.vault_beta_uploads where id=v.id;
end $$;

create or replace function public.vault_cancel_upload(p_id uuid,p_release boolean default false)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or auth.jwt()->>'aal' is distinct from 'aal2' then raise exception 'MFA required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 if p_release then
  delete from public.vault_beta_uploads u where u.id=p_id and u.user_id=auth.uid() and u.cancelled
   and not exists(select 1 from storage.objects o where o.bucket_id='medicea-vault-beta' and o.name=u.object_path);
 else
  update public.vault_beta_uploads set cancelled=true where id=p_id and user_id=auth.uid();
 end if;
end $$;
revoke all on function public.vault_begin_upload(text,bigint,text) from public,anon;
revoke all on function public.vault_finish_upload(uuid) from public,anon;
revoke all on function public.vault_cancel_upload(uuid,boolean) from public,anon;
grant execute on function public.vault_begin_upload(text,bigint,text) to authenticated;
grant execute on function public.vault_finish_upload(uuid) to authenticated;
grant execute on function public.vault_cancel_upload(uuid,boolean) to authenticated;

-- Direct object creation must match a live reservation. Existing owner/MFA guard remains.
create policy vault_beta_reserved_insert on storage.objects as restrictive for insert to authenticated
 with check(bucket_id<>'medicea-vault-beta' or exists(
 select 1 from public.vault_beta_uploads u where u.object_path=name and u.user_id=auth.uid()
 and not u.cancelled and u.expires_at>now()
 and (metadata->>'size')::bigint=u.size_bytes and metadata->>'mimetype'=u.mime_type));
-- Direct metadata writes cannot manufacture listings for missing/wrong-size storage objects.
create policy vault_beta_registered_insert on public.vault_beta_documents as restrictive for insert to authenticated
 with check(exists(select 1 from public.vault_beta_uploads u join storage.objects o
 on o.bucket_id='medicea-vault-beta' and o.name=u.object_path
 where u.id=vault_beta_documents.id and u.user_id=auth.uid() and not u.cancelled and u.expires_at>now()
 and u.object_path=vault_beta_documents.object_path and u.size_bytes=vault_beta_documents.size_bytes
 and u.mime_type=vault_beta_documents.mime_type and o.owner_id=auth.uid()::text
 and (o.metadata->>'size')::bigint=u.size_bytes and o.metadata->>'mimetype'=u.mime_type));
-- Metadata is immutable after registration; deletion remains permitted.
create policy vault_beta_document_no_update on public.vault_beta_documents as restrictive for update to authenticated
 using(false) with check(false);
alter table public.vault_beta_documents drop constraint vault_beta_documents_size_bytes_check;
alter table public.vault_beta_documents add constraint vault_beta_documents_size_bytes_check
 check(size_bytes between 1 and 50000000);
update storage.buckets set file_size_limit=50000000 where id='medicea-vault-beta';
commit;
