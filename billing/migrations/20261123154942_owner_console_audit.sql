-- Dedicated medicea-billing-test only. No medical/vault database access.
BEGIN;
CREATE ROLE medicea_console_server NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
GRANT CONNECT ON DATABASE postgres TO medicea_console_server;
GRANT USAGE ON SCHEMA medicea_billing TO medicea_console_server;
-- Intentionally owner-executed view in an unexposed private schema: only the
-- restricted console service can read these bounded account fields. The service
-- receives no direct auth-table, password, token or arbitrary metadata access.
CREATE VIEW medicea_billing.console_account WITH (security_invoker=false) AS
 SELECT id,email,created_at,last_sign_in_at,email_confirmed_at,
 raw_user_meta_data->>'medicea_home_country' AS home_country FROM auth.users;
REVOKE ALL ON medicea_billing.console_account FROM PUBLIC,anon,authenticated;
GRANT SELECT ON medicea_billing.console_account TO medicea_console_server;
GRANT SELECT(provider,external_id,member_id,active,valid_until) ON medicea_billing.entitlement TO medicea_console_server;
GRANT SELECT(member_id,customer_id) ON medicea_billing.stripe_customer TO medicea_console_server;
GRANT INSERT(member_id,customer_id) ON medicea_billing.stripe_customer TO medicea_console_server;
GRANT SELECT(email,active) ON medicea_billing.complimentary_access TO medicea_console_server;
GRANT SELECT(member_id,plan,fulfilled,revoked,superseded,verified_at,voided_order_id) ON medicea_billing.play_purchase TO medicea_console_server;

CREATE TABLE medicea_billing.console_operation(
 id uuid PRIMARY KEY,actor_id uuid NOT NULL,member_id uuid NOT NULL,
 action text NOT NULL CHECK(action IN ('refund','payment_request')),
 fingerprint text NOT NULL CHECK(fingerprint ~ '^[a-f0-9]{64}$'),payload jsonb NOT NULL,
 amount_minor integer NOT NULL CHECK(amount_minor>0 AND amount_minor<=1000000),
 currency text NOT NULL CHECK(currency IN ('GBP','EUR','USD')),reason text NOT NULL CHECK(length(reason) BETWEEN 1 AND 500),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','succeeded','needs_review')),
 provider_ref text,result jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX console_operation_member ON medicea_billing.console_operation(member_id,created_at DESC);
CREATE TABLE medicea_billing.console_audit(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),actor_id uuid NOT NULL,action text NOT NULL,
 member_id uuid,operation_id uuid,details jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX console_audit_member ON medicea_billing.console_audit(member_id,created_at DESC);
REVOKE ALL ON medicea_billing.console_operation,medicea_billing.console_audit FROM PUBLIC,anon,authenticated;
ALTER TABLE medicea_billing.console_operation ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicea_billing.console_audit ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT ON medicea_billing.console_operation,medicea_billing.console_audit TO medicea_console_server;
GRANT UPDATE(state,provider_ref,result,updated_at) ON medicea_billing.console_operation TO medicea_console_server;
CREATE POLICY console_operation_read ON medicea_billing.console_operation FOR SELECT TO medicea_console_server USING(true);
CREATE POLICY console_operation_insert ON medicea_billing.console_operation FOR INSERT TO medicea_console_server WITH CHECK(true);
CREATE POLICY console_operation_update ON medicea_billing.console_operation FOR UPDATE TO medicea_console_server USING(true) WITH CHECK(true);
CREATE POLICY console_audit_read ON medicea_billing.console_audit FOR SELECT TO medicea_console_server USING(true);
CREATE POLICY console_audit_insert ON medicea_billing.console_audit FOR INSERT TO medicea_console_server WITH CHECK(true);
COMMIT;
