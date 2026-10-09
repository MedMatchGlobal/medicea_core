-- READ ONLY. Run as a new query in Supabase SQL Editor.
-- Reports configuration and policies only; no user documents or account data.
begin transaction read only;

select id, public as publicly_accessible, file_size_limit,
  round(file_size_limit::numeric / 1024 / 1024, 2) as limit_mib,
  allowed_mime_types
from storage.buckets
where id = 'medicea-vault-beta';

select c.relname as table_name, c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname='vault_beta_documents';

select conname as constraint_name, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid=to_regclass('public.vault_beta_documents')
order by conname;

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where (schemaname='public' and tablename='vault_beta_documents')
   or (schemaname='storage' and tablename='objects')
order by schemaname, tablename, policyname;

commit;
