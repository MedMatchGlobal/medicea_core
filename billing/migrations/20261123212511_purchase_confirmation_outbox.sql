BEGIN;
CREATE TABLE medicea_billing.purchase_confirmation(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), provider_key text NOT NULL UNIQUE,
 member_id uuid NOT NULL,recipient text NOT NULL,snapshot jsonb NOT NULL,body text NOT NULL,
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','processing','sent','needs_review')),
 created_at timestamptz NOT NULL DEFAULT now(),claimed_at timestamptz,accepted_at timestamptz,last_error text
);
CREATE INDEX purchase_confirmation_pending ON medicea_billing.purchase_confirmation(created_at) WHERE state='pending';
CREATE INDEX purchase_confirmation_member ON medicea_billing.purchase_confirmation(member_id,created_at DESC,id);
REVOKE ALL ON medicea_billing.purchase_confirmation FROM PUBLIC,anon,authenticated;
ALTER TABLE medicea_billing.purchase_confirmation ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION medicea_billing.confirmation_immutable() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
BEGIN
 IF NEW.id IS DISTINCT FROM OLD.id OR NEW.provider_key IS DISTINCT FROM OLD.provider_key OR NEW.member_id IS DISTINCT FROM OLD.member_id OR NEW.recipient IS DISTINCT FROM OLD.recipient OR NEW.snapshot IS DISTINCT FROM OLD.snapshot OR NEW.body IS DISTINCT FROM OLD.body OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN RAISE EXCEPTION 'CONFIRMATION_IS_IMMUTABLE';END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION medicea_billing.confirmation_immutable() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER preserve_confirmation BEFORE UPDATE ON medicea_billing.purchase_confirmation FOR EACH ROW EXECUTE FUNCTION medicea_billing.confirmation_immutable();
COMMENT ON TABLE medicea_billing.purchase_confirmation IS 'Immutable versioned commercial confirmations; no medical input. SMTP acceptance is not proof of inbox delivery. Unknown outcomes require review instead of automatic resend.';
COMMIT;
