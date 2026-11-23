-- Keep Google Play purchase tokens out of the console service's readable columns.
BEGIN;
CREATE VIEW medicea_billing.console_entitlement WITH(security_invoker=false) AS
 SELECT provider,CASE WHEN provider='stripe' THEN external_id ELSE NULL END AS external_id,
 member_id,active,valid_until FROM medicea_billing.entitlement;
REVOKE ALL ON medicea_billing.console_entitlement FROM PUBLIC,anon,authenticated;
GRANT SELECT ON medicea_billing.console_entitlement TO medicea_console_server;
REVOKE SELECT(external_id) ON medicea_billing.entitlement FROM medicea_console_server;
COMMIT;
