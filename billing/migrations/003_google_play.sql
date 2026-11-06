-- Review and apply ONLY to the dedicated PostgreSQL billing database after 001/002.
-- Compatible with PlanetScale PostgreSQL; never apply to medicea-catalogue or vault.
BEGIN;
CREATE TABLE medicea_billing.play_purchase (
 token text PRIMARY KEY,
 member_id uuid NOT NULL,
 plan text NOT NULL CHECK(plan IN ('pass7','pass14','pass30','monthly','annual')),
 superseded boolean NOT NULL DEFAULT false,
 revoked boolean NOT NULL DEFAULT false,
 voided_order_id text,
 fulfilled boolean NOT NULL DEFAULT false,
 verified_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON medicea_billing.play_purchase(member_id);
REVOKE ALL ON medicea_billing.play_purchase FROM PUBLIC;
CREATE TABLE medicea_billing.play_reconcile_cursor (
 id integer PRIMARY KEY CHECK(id=1), page_token text NOT NULL DEFAULT ''
);
INSERT INTO medicea_billing.play_reconcile_cursor(id) VALUES(1);
REVOKE ALL ON medicea_billing.play_reconcile_cursor FROM PUBLIC;
COMMIT;
