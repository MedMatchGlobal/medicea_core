-- PREVIEW ONLY: apply to a dedicated billing database, never the vault database.
-- Run as the restricted server connection's schema owner. No browser SQL access.
CREATE SCHEMA IF NOT EXISTS medicea_billing;
REVOKE ALL ON SCHEMA medicea_billing FROM PUBLIC;
CREATE TABLE medicea_billing.entitlement (
 provider text NOT NULL CHECK (provider IN ('stripe','google_play')),
 external_id text NOT NULL,
 member_id uuid NOT NULL,
 active boolean NOT NULL DEFAULT false,
 valid_until timestamptz NOT NULL,
 customer_id text,
 PRIMARY KEY(provider, external_id)
);
CREATE INDEX ON medicea_billing.entitlement(member_id);
CREATE TABLE medicea_billing.search (
 id uuid PRIMARY KEY,
 member_id uuid NOT NULL,
 period text NOT NULL,
 state text NOT NULL CHECK(state IN ('reserved','succeeded','failed')),
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT (now()+interval '5 minutes')
);
CREATE INDEX ON medicea_billing.search(member_id,period);
CREATE TABLE medicea_billing.stripe_customer (
 member_id uuid PRIMARY KEY, customer_id text NOT NULL UNIQUE
);
CREATE OR REPLACE FUNCTION medicea_billing.member_status(p_member uuid) RETURNS jsonb
LANGUAGE sql AS $$
 SELECT jsonb_build_object(
 'used',count(*) FILTER(WHERE state='succeeded'),
 'reserved',count(*) FILTER(WHERE state='reserved' AND expires_at>now()),
 'limit',2,
 'premium',EXISTS(SELECT 1 FROM medicea_billing.entitlement WHERE member_id=p_member AND active AND valid_until>now()),
 'resetsAt',date_trunc('month',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'+interval '1 month')
 FROM medicea_billing.search WHERE member_id=p_member AND period=to_char(now() AT TIME ZONE 'UTC','YYYY-MM');
$$;
CREATE OR REPLACE FUNCTION medicea_billing.reserve_search(p_member uuid,p_id uuid) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE s jsonb; existing medicea_billing.search%ROWTYPE;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_member::text,0));
 SELECT * INTO existing FROM medicea_billing.search WHERE id=p_id;
 IF FOUND THEN RETURN jsonb_build_object('allowed',false,'reason','REQUEST_ALREADY_USED'); END IF;
 s:=medicea_billing.member_status(p_member);
 IF NOT (s->>'premium')::boolean AND (s->>'used')::int+(s->>'reserved')::int>=2 THEN
  RETURN jsonb_build_object('allowed',false,'reason','MONTHLY_LIMIT');
 END IF;
 -- Even unlimited personal plans have a bounded number of concurrent requests.
 IF (s->>'reserved')::int>=3 THEN RETURN jsonb_build_object('allowed',false,'reason','TOO_MANY_CONCURRENT_REQUESTS'); END IF;
 INSERT INTO medicea_billing.search(id,member_id,period,state) VALUES(p_id,p_member,to_char(now() AT TIME ZONE 'UTC','YYYY-MM'),'reserved');
 RETURN jsonb_build_object('allowed',true,'reason','RESERVED','id',p_id);
END;
$$;
CREATE OR REPLACE FUNCTION medicea_billing.finish_search(p_member uuid,p_id uuid,p_success boolean) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_member::text,0));
 UPDATE medicea_billing.search SET state=CASE WHEN p_success THEN 'succeeded' ELSE 'failed' END
 WHERE id=p_id AND member_id=p_member AND state='reserved' AND expires_at>now();
 IF NOT FOUND THEN RAISE EXCEPTION 'Reservation unavailable'; END IF;
END;
$$;
REVOKE ALL ON ALL TABLES IN SCHEMA medicea_billing FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA medicea_billing FROM PUBLIC;

CREATE TABLE medicea_billing.checkout (
 member_id uuid PRIMARY KEY, session_id text NOT NULL UNIQUE,
 plan text NOT NULL CHECK(plan IN ('monthly','annual')),url text NOT NULL,expires_at timestamptz NOT NULL
);
REVOKE ALL ON medicea_billing.checkout FROM PUBLIC;
