-- READ ONLY: one result cell containing all configuration, no user records.
-- Run as a new query, then export the result as JSON or CSV.
select jsonb_pretty(jsonb_build_object(
  'bucket', coalesce((select jsonb_agg(to_jsonb(b)) from (
    select id, public as publicly_accessible, file_size_limit,
      round(file_size_limit::numeric/1024/1024,2) as limit_mib, allowed_mime_types
    from storage.buckets where id='medicea-vault-beta'
  ) b), '[]'::jsonb),
  'table_rls', coalesce((select jsonb_agg(to_jsonb(r)) from (
    select c.relname as table_name, c.relrowsecurity as rls_enabled,
      c.relforcerowsecurity as rls_forced
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='vault_beta_documents'
  ) r), '[]'::jsonb),
  'constraints', coalesce((select jsonb_agg(to_jsonb(k)) from (
    select conname as constraint_name, pg_get_constraintdef(oid) as definition
    from pg_constraint where conrelid=to_regclass('public.vault_beta_documents')
    order by conname
  ) k), '[]'::jsonb),
  'policies', coalesce((select jsonb_agg(to_jsonb(p)) from (
    select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    from pg_policies
    where (schemaname='public' and tablename='vault_beta_documents')
       or (schemaname='storage' and tablename='objects')
    order by schemaname, tablename, policyname
  ) p), '[]'::jsonb)
)) as configuration_report;
