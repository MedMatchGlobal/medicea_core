# mediceaGO Personal — test preparation

Draft monthly £4.99 or annual £49.99, GBP. Annual saves £9.89 (16.5%). Paid monthly search allowance is uncapped; personal fair-use terms still need approval. Professional/team plans are not offered by this preparation. Concurrent requests are capped at three as a technical safeguard, not a hidden monthly paid allowance.

## Scope and launch gates

This branch has an isolated `/membership` preview: email OTP sign-in, a billing ledger, a metered human-equivalent integration probe, Stripe test Checkout, Customer Portal, and verified subscription webhooks. Production always returns 404 for membership routes even if MEDICEA_MEMBERSHIP_PREVIEW=true. Stripe live secret keys and live prices/subscriptions are rejected. No charges, provider product creation, remote database migration or Production change has been performed.

This is NOT launch-ready monetisation. The ordinary discovery UI and original AI endpoints remain unchanged and unmetered; do not enable the legacy NEXT_PUBLIC_ENABLE_USAGE_LIMITS switch as a substitute. Before release, integrate the ledger into every human/pet/generic/condition/leaflet/triage AI route, block direct-route bypasses, and make multi-request searches one billable operation (including their automatic origin leaflet). Saved-result reopening must not consume quota; generating a new result must. The existing two-search/two-leaflet marketing wording is historical and needs replacement only at activation. Match public copy, account flows and all 25 languages before public launch.

A calendar month means UTC, to avoid device/timezone differences. Failed and empty provider responses release the reserved slot; a successful completed search returning No matches counts. Only account identity verified with the auth server is trusted. Browser IDs, user-supplied account IDs, local premium markers and checkout return URLs do not grant membership access. The ledger stores account UUIDs, counts, request IDs and billing identifiers, not medicine queries/results or vault records.

## Sandbox setup

1. Use a separate test auth project with numerical email OTP and a dedicated PostgreSQL billing database. Do not apply the SQL to the medical/vault database. No credentials are copied from the released checkout.
2. Review and apply `migrations/001_membership.sql` to the dedicated billing database with the restricted server schema-owner connection. It creates only medicea_billing objects; no auth.users or medical tables are referenced. Keep database access server-only. The migration is a one-time initial schema, not a production upgrade command.
3. Set variables from `.env.example` only in local development or protected Vercel Preview. Use the actual preview origin, including scheme, without a path. The separate MEDICEA_BILLING_DATABASE_URL is mandatory and never falls back to DATABASE_URL. The membership cookie name is separate from the vault; sign-out is local to that session. Configure appropriate OTP rate limits and email templates in the test auth project.
4. In Stripe test mode, create Personal recurring GBP prices: 499 minor units/month and 4999/year, with no trial. Configure the price IDs, sk_test secret and webhook signing secret directly in the environment settings; never paste them in chat. Checkout verifies amount, currency, interval and test-mode price. Tax-inclusive pricing, applicable tax registration/collection and consumer terms must be resolved before live billing; do not promise a final payable price before that review.
5. Configure a Stripe TEST webhook for customer.subscription.created/updated/deleted, checkout.session.completed, invoice.paid and invoice.payment_failed. API version 2025-03-31.basil is pinned. The handler verifies the raw-body signature (five-minute tolerance), rejects live events, retrieves the latest subscription under a database lock, and validates the server-created customer/account binding. Repeated and reordered events converge on current provider state. Expiry is checked on each quota/status request, even if a notification is missing.
6. Protected Vercel previews reject unauthenticated provider webhooks. Prefer the Stripe CLI forwarding signed TEST webhooks to a local dev server for initial testing. A hosted test needs a deliberately configured webhook-only protection exception/bypass; never disable protection for the entire billing preview. CLI and dashboard endpoint secrets differ.
7. Customer Portal is test-only for subscription management. A cancellation at period end retains access until expiry; an immediately canceled, unpaid or past-due subscription does not grant paid access. The checkout success URL does not upgrade the user. Active subscriptions block new checkout; pending same-plan checkout is reused for its lifetime. A different plan during pending checkout is rejected until expiry. Plan changes go through the portal.

## Required provider acceptance

Test free quota across two sessions/devices; third request denial; concurrent overspend; invalid origin; sign-out; different-account isolation; failure releases quota; UTC monthly reset. Buy each TEST plan, restore the same entitlement in another session, repeat/reorder signed webhooks, cancel at period end, expire, simulate failed payment, and verify customer portal isolation. Check all endpoint responses for credential/provider-data disclosure. Full refunds, disputes, tax changes, data-erasure/retention, durable retry/reconciliation, and lifecycle notification handling still require implementation/review before live launch. The signature and ledger tests do not establish provider integration acceptance.

## Android and shared entitlements

Android Checkout is hidden on native Capacitor surfaces; Google Play purchasing is not implemented yet. No native app has been built/distributed. Implement Play Billing purchase/restore, server verification against the configured package/product/base-plan, account-bound obfuscated identifiers, acknowledgement, token uniqueness and linked-token handling, signed/authenticated RTDN processing and reconciliation before activating Android payments. Grant/revoke the same account entitlement used by web. Never accept a client Boolean, device marker or unverified purchase token as proof. This preparation deliberately does not use Stripe checkout as a replacement for native Play Billing.

Before Google review, testers need access that does not require real payment. Keep the released website and Android wrapper in their present beta configuration until all launch switches and native flows have passed acceptance and the owner authorises activation.

## Validation

`node --test tests/*.cjs` covers original medicine/prompt preservation plus production-off config, signatures, membership response charging and isolated PostgreSQL quotas. `npm run build` verifies the app. No original prompt, provider routing, temperature or model settings were edited. The public medicine feature files match released main.

References: [Stripe Checkout](https://docs.stripe.com/api/checkout/sessions/create), [webhook signatures](https://docs.stripe.com/events/manage-webhook-endpoints), [Customer Portal](https://docs.stripe.com/api/customer_portal/sessions/create), [Play purchase security](https://developer.android.com/google/play/billing/security), [Supabase server auth](https://supabase.com/docs/guides/auth/server-side/creating-a-client).

Validation on 12 October 2026: 31 tests passed; production build passed; local production HTTP smoke test returned 200 for the homepage and 404 for /membership and all six membership API routes even with the preview flag set true. Existing dependency versions and original medicine code/prompts are unchanged. Remote provider/billing database acceptance has not been run.
