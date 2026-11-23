-- Dedicated billing database only. Stores replay position, never payment credentials or medical data.
CREATE TABLE medicea_billing.stripe_event_checkpoint (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 through_time bigint NOT NULL DEFAULT 0,
 scan_after bigint,
 scan_before bigint,
 cursor text
);
REVOKE ALL ON medicea_billing.stripe_event_checkpoint FROM PUBLIC, anon, authenticated;
ALTER TABLE medicea_billing.stripe_event_checkpoint ENABLE ROW LEVEL SECURITY;
