-- Preview billing only. Pets join medicine; portal permissions never become AI quotas.
BEGIN;
-- Conflicting saved rules cannot be merged without an owner decision.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM medicea_billing.complimentary_permission p JOIN medicea_billing.complimentary_permission m ON m.email=p.email AND m.module='medicine' WHERE p.module='pets' AND (p.monthly_limit IS DISTINCT FROM m.monthly_limit OR p.expires_at IS DISTINCT FROM m.expires_at)) THEN
 RAISE EXCEPTION 'CONFLICTING_MEDICINE_POLICIES'; END IF;
END $$;
ALTER TABLE medicea_billing.complimentary_permission DROP CONSTRAINT complimentary_permission_module_check;
ALTER TABLE medicea_billing.complimentary_permission ADD CONSTRAINT complimentary_permission_module_check CHECK(module IN ('medicine','health','pets','portal'));
INSERT INTO medicea_billing.complimentary_permission(email,module,monthly_limit,expires_at)
 SELECT email,'medicine',monthly_limit,expires_at FROM medicea_billing.complimentary_permission WHERE module='pets' ON CONFLICT(email,module) DO NOTHING;
DELETE FROM medicea_billing.complimentary_permission WHERE module='pets';
ALTER TABLE medicea_billing.complimentary_permission DROP CONSTRAINT complimentary_permission_module_check;
ALTER TABLE medicea_billing.complimentary_permission ADD CONSTRAINT complimentary_permission_module_check CHECK(module IN ('medicine','health','portal'));
ALTER TABLE medicea_billing.complimentary_permission ADD CONSTRAINT portal_duration_only CHECK(module<>'portal' OR monthly_limit IS NULL);
-- Keep prior successes and in-flight reservations in the shared medicine count.
UPDATE medicea_billing.search SET module='medicine' WHERE module='pets';
CREATE OR REPLACE FUNCTION medicea_billing.member_status(p_member uuid,p_email text) RETURNS jsonb LANGUAGE sql AS $$
 WITH base AS (SELECT medicea_billing.member_status(p_member) AS s),
 gift AS (SELECT EXISTS(SELECT 1 FROM medicea_billing.complimentary_access WHERE email=lower(btrim(p_email)) AND active AND full_access) AS active),
 grants AS (SELECT p.module,p.monthly_limit,p.expires_at,
  (SELECT count(*) FROM medicea_billing.search WHERE member_id=p_member AND module=p.module AND state='succeeded' AND period=to_char(now() AT TIME ZONE 'UTC','YYYY-MM')) AS used,
  (SELECT count(*) FROM medicea_billing.search WHERE member_id=p_member AND module=p.module AND state='reserved' AND expires_at>now() AND period=to_char(now() AT TIME ZONE 'UTC','YYYY-MM')) AS reserved
  FROM medicea_billing.complimentary_permission p JOIN medicea_billing.complimentary_access a USING(email)
  WHERE email=lower(btrim(p_email)) AND a.active AND NOT a.full_access AND (p.expires_at IS NULL OR p.expires_at>now()))
 SELECT s||jsonb_build_object('paidAccess',(s->>'premium')::boolean,'complimentary',gift.active,
 'premium',(s->>'premium')::boolean OR gift.active,
 'portalAccess',gift.active OR EXISTS(SELECT 1 FROM grants WHERE module='portal'),
 'moduleAccess',COALESCE((SELECT jsonb_agg(jsonb_build_object('module',module,'monthlyLimit',monthly_limit,'expiresAt',expires_at,'used',used,'reserved',reserved,'remaining',CASE WHEN monthly_limit IS NULL THEN NULL ELSE greatest(0,monthly_limit-used-reserved) END) ORDER BY module) FROM grants),'[]'::jsonb)) FROM base,gift;
$$;
CREATE OR REPLACE FUNCTION medicea_billing.reserve_search(p_member uuid,p_id uuid,p_email text,p_module text) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE s jsonb; reservation jsonb; policy medicea_billing.complimentary_permission%ROWTYPE;
BEGIN
 IF p_module='pets' THEN p_module:='medicine'; END IF;
 IF p_module NOT IN ('medicine','health') OR p_module IS NULL THEN RETURN jsonb_build_object('allowed',false,'reason','INVALID_MODULE'); END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_member::text,0));
 PERFORM 1 FROM medicea_billing.complimentary_access WHERE email=lower(btrim(p_email)) FOR SHARE;
 s:=medicea_billing.member_status(p_member,p_email);
 IF EXISTS(SELECT 1 FROM medicea_billing.search WHERE id=p_id) THEN RETURN jsonb_build_object('allowed',false,'reason','REQUEST_ALREADY_USED'); END IF;
 IF (s->>'reserved')::int>=3 THEN RETURN jsonb_build_object('allowed',false,'reason','TOO_MANY_CONCURRENT_REQUESTS'); END IF;
 IF (s->>'premium')::boolean THEN
  INSERT INTO medicea_billing.search(id,member_id,period,state,access_source,module)
  VALUES(p_id,p_member,to_char(now() AT TIME ZONE 'UTC','YYYY-MM'),'reserved',CASE WHEN (s->>'paidAccess')::boolean THEN 'paid' ELSE 'complimentary' END,p_module);
 ELSE
  SELECT p.* INTO policy FROM medicea_billing.complimentary_permission p JOIN medicea_billing.complimentary_access a USING(email)
   WHERE email=lower(btrim(p_email)) AND p.module=p_module AND a.active AND NOT a.full_access AND (p.expires_at IS NULL OR p.expires_at>now());
  IF FOUND THEN
   IF policy.monthly_limit IS NOT NULL AND
    (SELECT count(*) FROM medicea_billing.search WHERE member_id=p_member AND module=p_module AND period=to_char(now() AT TIME ZONE 'UTC','YYYY-MM') AND (state='succeeded' OR (state='reserved' AND expires_at>now())))>=policy.monthly_limit
    THEN RETURN jsonb_build_object('allowed',false,'reason','MONTHLY_LIMIT'); END IF;
   INSERT INTO medicea_billing.search(id,member_id,period,state,access_source,module)
   VALUES(p_id,p_member,to_char(now() AT TIME ZONE 'UTC','YYYY-MM'),'reserved','complimentary',p_module);
  ELSE
   reservation:=medicea_billing.reserve_search(p_member,p_id);
   IF NOT (reservation->>'allowed')::boolean THEN RETURN reservation; END IF;
   UPDATE medicea_billing.search SET module=p_module WHERE id=p_id;
   RETURN reservation;
  END IF;
 END IF;
 RETURN jsonb_build_object('allowed',true,'reason','RESERVED','id',p_id,'source',CASE WHEN (s->>'paidAccess')::boolean THEN 'paid' ELSE 'complimentary' END);
END;
$$;
COMMIT;
