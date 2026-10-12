-- Read-only setup check: no user records are read or changed.
select name as component, to_regclass('public.' || name) is not null as exists,
  coalesce((select relrowsecurity and relforcerowsecurity from pg_class
    where oid = to_regclass('public.' || name)), false) as owner_security_enabled
from (values ('vault_beta_documents'), ('vault_beta_medicines')) as components(name);

select id, public as publicly_accessible, file_size_limit
from storage.buckets where id = 'medicea-vault-beta';
