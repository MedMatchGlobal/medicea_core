-- Preview-only supporting-tool abuse control. No search text or medical input is stored.
BEGIN;
CREATE TABLE medicea_billing.helper_budget (
 member_id uuid PRIMARY KEY,
 minute_at timestamptz NOT NULL, hour_at timestamptz NOT NULL, day_at timestamptz NOT NULL,
 minute_calls integer NOT NULL DEFAULT 0, hour_calls integer NOT NULL DEFAULT 0, day_calls integer NOT NULL DEFAULT 0,
 hour_chars integer NOT NULL DEFAULT 0, day_chars integer NOT NULL DEFAULT 0,
 CHECK(minute_calls>=0 AND hour_calls>=0 AND day_calls>=0 AND hour_chars>=0 AND day_chars>=0)
);
REVOKE ALL ON medicea_billing.helper_budget FROM PUBLIC,anon,authenticated;
ALTER TABLE medicea_billing.helper_budget ENABLE ROW LEVEL SECURITY;
-- Invoker is the existing private billing server connection; no public RPC grant.
CREATE FUNCTION medicea_billing.consume_helper_budget(p_member uuid,p_chars integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,medicea_billing AS $$
DECLARE stamp timestamptz:=clock_timestamp(); bucket medicea_billing.helper_budget%ROWTYPE;
 minute_start timestamptz:=date_trunc('minute',stamp); hour_start timestamptz:=date_trunc('hour',stamp);
 day_start timestamptz:=date_trunc('day',stamp AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'; retry integer:=0;
BEGIN
 IF p_member IS NULL OR p_chars IS NULL OR p_chars<1 OR p_chars>64000 THEN RAISE EXCEPTION 'INVALID_HELPER_REQUEST'; END IF;
 INSERT INTO medicea_billing.helper_budget(member_id,minute_at,hour_at,day_at) VALUES(p_member,minute_start,hour_start,day_start) ON CONFLICT(member_id) DO NOTHING;
 SELECT * INTO bucket FROM medicea_billing.helper_budget WHERE member_id=p_member FOR UPDATE;
 stamp:=clock_timestamp();minute_start:=date_trunc('minute',stamp);hour_start:=date_trunc('hour',stamp);
 day_start:=date_trunc('day',stamp AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
 IF bucket.minute_at<>minute_start THEN bucket.minute_calls:=0; END IF;
 IF bucket.hour_at<>hour_start THEN bucket.hour_calls:=0;bucket.hour_chars:=0; END IF;
 IF bucket.day_at<>day_start THEN bucket.day_calls:=0;bucket.day_chars:=0; END IF;
 IF bucket.minute_calls>=12 THEN retry:=greatest(retry,ceil(extract(epoch FROM minute_start+interval '1 minute'-stamp))::integer); END IF;
 IF bucket.hour_calls>=120 OR bucket.hour_chars+p_chars>128000 THEN retry:=greatest(retry,ceil(extract(epoch FROM hour_start+interval '1 hour'-stamp))::integer); END IF;
 IF bucket.day_calls>=600 OR bucket.day_chars+p_chars>512000 THEN retry:=greatest(retry,ceil(extract(epoch FROM day_start+interval '1 day'-stamp))::integer); END IF;
 IF retry>0 THEN RETURN jsonb_build_object('allowed',false,'retryAfter',greatest(1,retry)); END IF;
 UPDATE medicea_billing.helper_budget SET minute_at=minute_start,hour_at=hour_start,day_at=day_start,
 minute_calls=bucket.minute_calls+1,hour_calls=bucket.hour_calls+1,day_calls=bucket.day_calls+1,
 hour_chars=bucket.hour_chars+p_chars,day_chars=bucket.day_chars+p_chars WHERE member_id=p_member;
 RETURN jsonb_build_object('allowed',true);
END;
$$;
REVOKE ALL ON FUNCTION medicea_billing.consume_helper_budget(uuid,integer) FROM PUBLIC,anon,authenticated;
COMMENT ON TABLE medicea_billing.helper_budget IS 'One current counter row per account; no text, language, IP, payment or medical data. Server-only supporting translation abuse budget. Not medicine-search quota.';
COMMIT;
