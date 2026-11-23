# medicéa owner console

Independent Next.js application: deploy with **admin-console** as the project
root. There is no customer-app admin link or shared customer-session privilege.
Vercel protection is enabled for every deployment. APIs separately require the
configured owner’s verified Supabase identity, validated `aal2` JWT, and a TOTP
verification within 15 minutes. Email sign-in alone never grants billing access.

## Sandbox only

MEDICEA_CONSOLE_SANDBOX must be `true`; VERCEL_ENV must not be `production`.
Production remains disabled even if someone accidentally sets the sandbox flag.
Only test Stripe keys and test provider objects are accepted. Database connections
must use the restricted `medicea_console_server` role in medicea-billing-test.
No medical/vault database credentials, auth service-role key or raw auth tokens
are used. The service can read a bounded private account view, not auth secrets.

The SQL audit is append-only for the service role. Financial operation IDs and
fingerprints prevent changed-payload retries. Provider requests use idempotency
keys; uncertain refunds are recovered by operation metadata before issuing another
refund. Automatic retries older than 23 hours are rejected for manual reconciliation.
Audit/operation records are private and must not be included in public exports.

## What it does

- Paginated account search by verified-account email or ID. Unregistered
  complimentary email invitations are not accounts yet.
- Account dates, verification, home country, active access, actual Stripe
  subscription and pass details, and scheduled subscriptions or reserved passes.
- Paginated Stripe charges, actual currency and refunded amounts. Plan history
  can exceed the initial provider view; a warning appears rather than claiming
  that a truncated list is complete. Play verification records are capped at 100
  per view; Play refund handling still uses Google Play Console.
- Full or partial refunds capped at the fresh remaining amount and 10,000 currency
  units per action. Disputed purchases require provider review. Final provider
  status is shown; pending/failed refunds are not described as completed.
- A one-off, inclusive-VAT checkout link, shown for owner review and sharing.
  The customer supplies/approves payment in Stripe. No `/pay` or `/send` call is
  made, no email is sent, and no saved card is silently charged. Links expire at
  the provider’s stated time. The description appears on Checkout. An invoice is
  generated on successful payment. This does not grant or change app access.
- Console financial history includes reason, operation ID and provider result.

Refunding does not stop a renewal. Coordinate cancellation separately. Invoiced
purchases may also require a linked credit note; use billing/OPERATIONS.md and
the accountant's advice. Play purchases are not refunded by calling Stripe.
Payment requests must not be used to bypass applicable store billing policies.

## Environment variables — Preview only

MEDICEA_CONSOLE_SANDBOX, MEDICEA_CONSOLE_OWNER_EMAIL, MEDICEA_CONSOLE_ORIGIN,
MEDICEA_CONSOLE_AUTH_URL, MEDICEA_CONSOLE_AUTH_KEY,
MEDICEA_CONSOLE_DATABASE_URL, MEDICEA_CONSOLE_STRIPE_KEY,
MEDICEA_CONSOLE_PRODUCT, MEDICEA_CONSOLE_TAX_CODE.

Keep the database URL and Stripe key as Sensitive/Secret values. Never paste keys
in chat, commit them, or put them in NEXT_PUBLIC variables. Use a dedicated Stripe
restricted **test** key with only the required permissions: customer read/write,
Checkout Session read/write, charge read, refund read/write, subscription and
subscription-schedule read, product/price read, invoice creation, and tax settings
and registrations read. Confirm the actual Dashboard permission labels and test
the flow; do not enable unrelated Stripe products or live access.

The initial owner must sign in with email and enroll/verify an authenticator in
the private console. This cannot be completed on the owner's behalf. A second
factor/recovery arrangement should be kept securely; do not weaken the server's
MFA requirement to recover access.

## Verification and limits

Run `npm ci`, `npm test`, `npx tsc --noEmit`, `npm run build` in this directory.
Root tests/console-database.cjs verifies database least privilege and append-only
audit in isolated PostgreSQL. The restricted hosted database connection is
verified using Supabase's CA and hostname checking; TLS checks are not disabled.

Before enabling financial actions, configure the dedicated restricted key, complete
owner sign-in/MFA, and exercise a dedicated QA payment request, partial refund,
full refund and duplicate retry. UI fixture tests alone do not prove a real
provider refund. No production account was charged or refunded during this build.
