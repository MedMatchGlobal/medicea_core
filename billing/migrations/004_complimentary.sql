-- Dedicated billing Preview only. Existing paid entitlements are untouched.
BEGIN;
CREATE TABLE medicea_billing.complimentary_access (
 email text PRIMARY KEY CHECK(email=lower(btrim(email)) AND length(email)<=254),
 note text NOT NULL DEFAULT '' CHECK(length(note)<=200),
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by uuid NOT NULL
);
CREATE TABLE medicea_billing.complimentary_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_id uuid NOT NULL,email text NOT NULL,
 action text NOT NULL CHECK(action IN ('grant','revoke')),
 note text NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE medicea_billing.search DROP CONSTRAINT search_access_source_check;
ALTER TABLE medicea_billing.search ADD CONSTRAINT search_access_source_check CHECK(access_source IN ('free','trial','paid','complimentary'));
REVOKE ALL ON medicea_billing.complimentary_access,medicea_billing.complimentary_audit FROM PUBLIC;
-- p_email is supplied only by the server from a verified signed-in identity.
CREATE FUNCTION medicea_billing.member_status(p_member uuid,p_email text) RETURNS jsonb LANGUAGE sql AS $$
 WITH base AS (SELECT medicea_billing.member_status(p_member) AS s),
 gift AS (SELECT EXISTS(SELECT 1 FROM medicea_billing.complimentary_access WHERE email=lower(btrim(p_email)) AND active) AS active)
 SELECT s||jsonb_build_object('paidAccess',(s->>'premium')::boolean,'complimentary',gift.active,
 'premium',(s->>'premium')::boolean OR gift.active) FROM base,gift;
$$;
CREATE FUNCTION medicea_billing.reserve_search(p_member uuid,p_id uuid,p_email text) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE s jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_member::text,0));
 -- Lock a grant while reserving so revocation and new reservations serialize.
 PERFORM 1 FROM medicea_billing.complimentary_access WHERE email=lower(btrim(p_email)) AND active FOR SHARE;
 IF NOT FOUND THEN RETURN medicea_billing.reserve_search(p_member,p_id); END IF;
 IF EXISTS(SELECT 1 FROM medicea_billing.search WHERE id=p_id) THEN RETURN jsonb_build_object('allowed',false,'reason','REQUEST_ALREADY_USED'); END IF;
 s:=medicea_billing.member_status(p_member);
 IF (s->>'reserved')::int>=3 THEN RETURN jsonb_build_object('allowed',false,'reason','TOO_MANY_CONCURRENT_REQUESTS'); END IF;
 INSERT INTO medicea_billing.search(id,member_id,period,state,access_source)
 VALUES(p_id,p_member,to_char(now() AT TIME ZONE 'UTC','YYYY-MM'),'reserved','complimentary');
 RETURN jsonb_build_object('allowed',true,'reason','RESERVED','id',p_id,'source','complimentary');
END;
$$;
REVOKE ALL ON FUNCTION medicea_billing.member_status(uuid,text),medicea_billing.reserve_search(uuid,uuid,text) FROM PUBLIC;
COMMIT;
