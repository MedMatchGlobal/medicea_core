-- Dedicated sandbox billing project only; never apply to the medical/vault database.
-- Credentials and the protected preview URL are provisioned separately in Supabase Vault.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
DO $migration$
DECLARE task bigint;
BEGIN
 SELECT cron.schedule('medicea-stripe-preview-reconciliation','* * * * *',
 $job$SELECT net.http_post(
  url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='medicea_stripe_reconcile_url'),
  headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='medicea_stripe_reconcile_token')),
  body := '{}'::jsonb, timeout_milliseconds := 300000);$job$) INTO task;
 -- Enable only after the preview secret, protected URL and successful HTTP check are confirmed.
 PERFORM cron.alter_job(task,active:=false);
END $migration$;
