-- Apply only AFTER 001 to the separate preview billing database. Not the vault DB.
BEGIN;
ALTER TABLE medicea_billing.checkout DROP CONSTRAINT checkout_plan_check;
ALTER TABLE medicea_billing.checkout ADD CONSTRAINT checkout_plan_check CHECK(plan IN ('pass7','pass14','pass30','monthly','annual'));
ALTER TABLE medicea_billing.search ADD COLUMN access_source text NOT NULL DEFAULT 'free' CHECK(access_source IN ('free','trial','paid'));
CREATE TABLE medicea_billing.trial (
 member_id uuid PRIMARY KEY, started_at timestamptz
);
REVOKE ALL ON medicea_billing.trial FROM PUBLIC;
CREATE OR REPLACE FUNCTION medicea_billing.member_status(p_member uuid) RETURNS jsonb LANGUAGE sql AS $$
 SELECT jsonb_build_object(
 'used',(SELECT count(*) FROM medicea_billing.search WHERE member_id=p_member AND access_source='free' AND state='succeeded' AND period=to_char(now() AT TIME ZONE 'UTC','YYYY-MM')),
 'reserved',(SELECT count(*) FROM medicea_billing.search WHERE member_id=p_member AND state='reserved' AND expires_at>now()),
 'freeReserved',(SELECT count(*) FROM medicea_billing.search WHERE member_id=p_member AND access_source='free' AND state='reserved' AND expires_at>now() AND period=to_char(now() AT TIME ZONE 'UTC','YYYY-MM')),
 'trialReserved',(SELECT count(*) FROM medicea_billing.search WHERE member_id=p_member AND access_source='trial' AND state='reserved' AND expires_at>now()),
 'trialUsed',(SELECT count(*) FROM medicea_billing.search WHERE member_id=p_member AND access_source='trial' AND state='succeeded'),
 'trialAvailable',NOT EXISTS(SELECT 1 FROM medicea_billing.trial WHERE member_id=p_member AND started_at+interval '7 days'<=now()),
 'trialEndsAt',(SELECT started_at+interval '7 days' FROM medicea_billing.trial WHERE member_id=p_member),
 'trialLimit',5,'limit',2,
 'premium',EXISTS(SELECT 1 FROM medicea_billing.entitlement WHERE member_id=p_member AND active AND valid_until>now()),
 'resetsAt',date_trunc('month',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'+interval '1 month');
$$;
CREATE OR REPLACE FUNCTION medicea_billing.reserve_search(p_member uuid,p_id uuid) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE s jsonb; source text;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_member::text,0));
 IF EXISTS(SELECT 1 FROM medicea_billing.search WHERE id=p_id) THEN RETURN jsonb_build_object('allowed',false,'reason','REQUEST_ALREADY_USED'); END IF;
 s:=medicea_billing.member_status(p_member);
 IF (s->>'reserved')::int>=3 THEN RETURN jsonb_build_object('allowed',false,'reason','TOO_MANY_CONCURRENT_REQUESTS'); END IF;
 IF (s->>'premium')::boolean THEN source:='paid';
 ELSIF (s->>'trialAvailable')::boolean AND (s->>'trialUsed')::int+(s->>'trialReserved')::int<5 THEN source:='trial';
 ELSIF (s->>'trialAvailable')::boolean AND (s->>'trialReserved')::int>0 THEN
  RETURN jsonb_build_object('allowed',false,'reason','TRIAL_REQUESTS_PENDING');
 ELSIF (s->>'used')::int+(s->>'freeReserved')::int<2 THEN source:='free';
 ELSE RETURN jsonb_build_object('allowed',false,'reason','MONTHLY_LIMIT'); END IF;
 INSERT INTO medicea_billing.trial(member_id) VALUES(p_member) ON CONFLICT DO NOTHING;
 INSERT INTO medicea_billing.search(id,member_id,period,state,access_source) VALUES(p_id,p_member,to_char(now() AT TIME ZONE 'UTC','YYYY-MM'),'reserved',source);
 RETURN jsonb_build_object('allowed',true,'reason','RESERVED','id',p_id,'source',source);
END;
$$;
CREATE OR REPLACE FUNCTION medicea_billing.finish_search(p_member uuid,p_id uuid,p_success boolean) RETURNS void LANGUAGE plpgsql AS $$
DECLARE source text;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_member::text,0));
 UPDATE medicea_billing.search SET state=CASE WHEN p_success THEN 'succeeded' ELSE 'failed' END
 WHERE id=p_id AND member_id=p_member AND state='reserved' AND expires_at>now() RETURNING access_source INTO source;
 IF NOT FOUND THEN RAISE EXCEPTION 'Reservation unavailable'; END IF;
 IF p_success AND source='trial' THEN UPDATE medicea_billing.trial SET started_at=now() WHERE member_id=p_member AND started_at IS NULL; END IF;
END;
$$;
COMMIT;
