# Google Play billing preparation — 29 October 2026

This is isolated test implementation, not an activated payment release.

## Test setup update — 3 November 2026

The owner successfully signed into the Google Play branch preview using an email
code. The account showed an existing paid entitlement; this is not evidence of a
Google Play purchase. Plan buttons no longer label every plan Active based on the
account-wide premium flag. Duplicate purchases remain disabled while premium.

A strict-TLS metadata check confirmed the dedicated Supabase medicea-billing-test
schema. After a successful preflight and 15 database/provider lifecycle tests,
migration 003_google_play.sql was applied in one transaction at 08:29 UTC. It created
only play_purchase and play_reconcile_cursor; no existing entitlement, account,
search, catalogue or vault records were changed. The migration SHA-256 is
7099f54acf632ef7414bb2393536db2ca374e8c442541a28abcc093a78f84bab.
The redacted result is deliverables/google-play-test-migration.json in the chat
workspace. scripts/apply-play-test-migration.cjs defaults to preflight only, pins
the dedicated test project, requires strict TLS and the reviewed migration hash,
and refuses to reapply if either Play table exists. It contains no credentials.

The owner entered Preview-only Google credentials, account/reconciliation secrets,
membership flags, auth configuration and the stable branch origin in Vercel.
The stored Google credential values still need deployed-provider verification.
Authenticated Pub/Sub notifications, scheduled reconciliation, Play products and
device purchase/restore acceptance remain outstanding. Production remains disabled.
The older sections below record the earlier preparation state.

### Specific active-plan display

Status now returns allowlisted activePlans from server billing records, resolving
Google plan names from the owned, non-revoked purchase ledger and Stripe plan names
from test-mode provider objects with matching member/customer bindings and price IDs.
Provider references, tokens and customer IDs never enter the status response.
Verified active cards/buttons use a soft green Active pass/Active subscription label;
other choices remain disabled while premium. Google UI uses only activePlayPlans,
so a Stripe subscription is not presented as a Google Play purchase. All new copy
is translated across the 25 membership languages. Unknown plan metadata leaves
paid access intact and shows an explicit details-unavailable message.

The existing signed-in owner's active record is a Stripe subscription, but the
Google Play preview has not yet received its Stripe test secret and price settings.
Its monthly/annual identity therefore remains unconfirmed. Do not infer it from
expiry, amount or the premium flag. No entitlement was changed for this UI work.
43 membership/provider/prompt checks and the optimized build passed. Local fixtures
were used to inspect active pass and active subscription styling without purchases.

## Google provider access confirmed — 30 October 2026

The owner enabled the Android Publisher API in project app-ab26f924 and created
medicea-play-billing@app-ab26f924.iam.gserviceaccount.com. The service account is
active in Play Console for medicéa. After the owner supplied its local credential
file, a read-only check at 11:09 UTC successfully authenticated through Google's
OAuth endpoint and received HTTP 200 from the Voided Purchases API for
global.medicea.app. No purchase/order data, token or private credential was logged.
This establishes provider authentication and Billing read access, not acceptance of
the five products, actual purchase verification, acknowledgement or consumption.

The original credential file has owner/SYSTEM-only Windows ACLs. A DPAPI-encrypted
copy lives in the protected signing-private directory outside this repository, and
its decryption was checked in memory. No raw credential or private key was committed,
packaged, copied into an environment file or installed in Vercel. The redacted report
is deliverables/google-play-api-access-check.json in the chat workspace.

scripts/check-play-access.cjs reproduces the read-only check from a locally supplied
credential path using the implementation's OAuth helper. It deliberately does not
print response bodies or tokens. Server deployment configuration, dedicated billing
database migration, RTDN/reconciliation, Play products and device acceptance remain
pending; Production billing remains disabled.

## Signed wrapper candidate follow-up

The owner confirmed that the wrapper must keep loading https://medicea.global.
Candidate 16 (version name 1.0.1) preserves the launcher artwork and SDK settings
(minimum 24, compile/target 36) from the previous chat's prepared build 15. Only those
Android packaging inputs were copied; no web feature branch was merged. Build 15's
local manifest records playUploaded=false, so candidate 16 still needs checking against
the highest version already used in Play before upload.

The local upload keystore certificate exactly matched Play's old fingerprint
90:DC:21:52:6E:F2:B6:6B:4F:51:82:F5:C3:0C:52:81:22:85:49:09:48:79:F8:A9:C5:40:64:30:4E:C5:7F:1B.
Because that keystore/password had been committed, a replacement 3072-bit RSA upload
key was generated outside the repository. Its random password is encrypted with
Windows DPAPI for the owner's Windows account, and recovery was verified. Private
files are restricted by Windows ACL; neither key nor password is packaged or committed.
Replacement certificate SHA-256:
0C:5D:14:93:06:6C:8E:20:57:A8:0A:BC:09:D7:CB:0E:03:D5:D8:13:D7:DB:E1:34:C3:99:3F:6E:70:35:90:B3.

The owner submitted the reset manually. The refreshed Play Console reports validity
from 31 October 2026 at 17:39 (console-displayed time); active registration has not yet
been verified. The app-signing key was not changed.

Candidate 16 builds successfully with bundleRelease and passes bundletool validation,
JAR signature verification and signer-fingerprint checks. Its packaged manifest contains
BILLING and Billing Library 9.1.0; the packaged Capacitor config still targets
medicea.global. The release signing inputs are supplied transiently from the protected
local key/password files. All 56 automated tests pass after the packaging changes.

This candidate is for the next approved testing/catalogue-setup upload. Current
Production web content still has no activated membership purchasing. Uploading this
wrapper alone does not deploy the new server verification routes or purchase UI.
Google Play products/permissions/credentials, the dedicated billing migration and
notification/reconciliation configuration remain pending. Those server credentials
are not configured in this checkout. Do not promise purchase testing until that setup
and the approved web deployment/testing boundary have been completed.

No Play upload, rollout, product activation, Production deployment or database change
has occurred. The deliverables folder contains the local candidate, manifest/check
report and public replacement certificate; preserve the protected key separately.

## Validation completed

* 56 automated tests pass, including PostgreSQL ledger/migration tests using PGlite,
  provider response fixtures, account isolation, replay/linked-token/refund handling,
  real RSA signature tests for notification identity, route authorization and unchanged
  medicine prompts. These are not live Google or PlanetScale acceptance tests.
* Optimized Next.js build and TypeScript checks pass.
* Initial implementation: Capacitor Android sync and :app:compileDebugJavaWithJavac pass with JDK 21,
  SDK 35 and Google Billing 9.1.0. The signed follow-up above preserves the later SDK 36 wrapper.
* Local Production-mode HTTP smoke checks return 404 for membership and every new
  Play endpoint, with both Preview/test switches deliberately set true.

Remaining setup: configure the five Play test plans and restricted provider credentials;
inspect the existing dedicated billing database and review/apply migration 003 there;
configure authenticated notifications and reconciliation; run licence-tester device
acceptance; review translations and upload signing before a release candidate.

## Audit and isolation

Repository: MedMatchGlobal/medicea_core. Local branch: feature/google-play-billing.
Base: clean feature/monetisation-preview at 2c34b4badebaac61ee5c36d3762387917a4de41c,
matching GitHub when inspected. Main was f4ab1bd9ed8ec3eaaab129a8a21c85e6dbe23f37.
Open draft PRs 5 (membership), 6 (model testing), and 7 (travel/library) were inspected;
none was merged or modified. No model, prompt, catalogue, vault or production files
in the other checkout were changed. This checkout was cloned into this chat's
writable workspace; it does not share a working tree with the original chat.

The older chat now advances medicine catalogue work every four hours. Its records
identify PlanetScale PostgreSQL medicea-catalogue/main, dmd_staging and leaflet_library.
The existing billing code instead requires a dedicated MEDICEA_BILLING_DATABASE_URL
and medicea_billing schema. Its SQL supports PostgreSQL, including PlanetScale
PostgreSQL, not PlanetScale MySQL/Vitess. The owner confirmed on 29 October that billing should stay in its existing dedicated
database. No live database connection or schema was changed by this task. A dedicated billing target, current schema and restricted role
must be verified before applying migration 003; never apply billing to the catalogue
or patient vault. No fallback to DATABASE_URL exists.

## Catalogue to configure in Play test setup

| Plan | Product ID | Base plan | GBP launch price |
| --- | --- | --- | --- |
| 7-day pass | medicea_pass_7 | one-time consumable | 1.49 |
| 14-day pass | medicea_pass_14 | one-time consumable | 1.99 |
| 30-day pass | medicea_pass_30 | one-time consumable | 2.99 |
| Monthly | medicea_personal | monthly, auto-renewing | 2.49 |
| Annual | medicea_personal | annual, auto-renewing | 19.99 |

These IDs are proposed allowlisted identifiers, not evidence that products exist.
If Play already has IDs, reconcile the constants before provider testing. Configure
local-currency prices in Play and check them there. The native UI displays Google's
localized ProductDetails price and explicit renewal disclosure. No trial or discount
offers are selected. The existing web Stripe test flow remains separate.

## Implemented flow

The Capacitor plugin uses Billing Library 9.1.0, queries products and owned purchases,
and launches Google checkout with the server-derived obfuscated account ID. The
manifest declares BILLING. Native membership shows purchase, restore, and Play
subscription management controls. Pending payment never grants access. Resuming the
native membership screen queries purchases again. Consumed passes are restored from
the signed-in account's server ledger, including after reinstall or on another device.
An unaffiliated account cannot claim an existing token.

Server purchase verification calls Android Publisher for the fixed application
global.medicea.app and exact product/base plan. Only Google licence-test purchases
are accepted. Active/cancelled-until-expiry/grace subscriptions receive access; hold,
pause, pending and expired states do not. Pass duration starts at Google's purchase
timestamp and cannot be extended by replay. Tokens are unique; replaced subscription
tokens remain tombstoned. Grants update the existing server membership entitlement
table, so normal guarded search handlers use the same account and quotas.

The transaction commits the grant before server-side pass consumption or initial
subscription acknowledgement. Restore and reconciliation retry provider failures.
Linked-token changes are serialized. Tokens are not returned by account restore,
logged, saved in browser storage or treated as client premium flags.

Authenticated Google Pub/Sub OIDC notifications verify the issuer, RS256 signature,
audience and verified service-account email. Notifications trigger a fresh Google
read; their claimed active state is never trusted. Voided-purchase notifications revoke known tokens. Subscription refunds are matched
to the current order so historical refunds cannot revoke a newer paid renewal. A private reconciliation endpoint refreshes stored
purchases oldest first, up to ten per request. Schedule it at least every five minutes
with enough calls for the backlog. Google entitlements have a 15-minute verification
lease, capped by actual expiry: missed jobs eventually deny paid access rather than
silently retain stale access. This is a deliberate test safeguard and requires
operational load/availability review before launch. Restore refreshes the account.

## Protected test configuration

Keep existing membership preview/auth/database configuration. Add server-only:

* MEDICEA_GOOGLE_PLAY_TEST=true (still requires membership Preview mode).
* GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL and GOOGLE_PLAY_PRIVATE_KEY from a restricted
  Android Publisher service account. Never place private credentials in NEXT_PUBLIC
  variables, Android resources, chat, source control or the browser.
* GOOGLE_PLAY_ACCOUNT_SECRET: stable independent random secret, at least 32 characters.
  Changing it breaks existing purchase account bindings; plan rotation separately.
* GOOGLE_PLAY_RTDN_AUDIENCE: exact HTTPS notification endpoint audience.
* GOOGLE_PLAY_RTDN_EMAIL: expected Pub/Sub push authentication service account.
* GOOGLE_PLAY_RECONCILE_SECRET: independent random secret, at least 32 characters.

Endpoints: POST /api/membership/play (authenticated same-origin verification/restore),
POST /api/membership/play/rtdn (Google-authenticated push), and
POST /api/membership/play/reconcile (Bearer reconciliation secret).
Configure notifications including voided purchases. Protect the entire preview;
any hosting-protection exception must apply only to the authenticated notification
endpoint. No schedule, credentials or service account was created here.

Migration 003 is additive and unapplied. Inspect the current dedicated billing schema,
take the normal backup and review it before applying after 001/002. It creates only
medicea_billing.play_purchase and a small reconciliation cursor table. The existing entitlement provider constraint already
permits google_play, so quota functions and clinical data need no migration.

## Release gates and known limits

Production remains disabled by the existing membership gate even if the new flag is
set. The wrapper still loads https://medicea.global; it will not display the Preview
membership flow until a deliberately configured test backend is used. Do not enable
Production or point the released wrapper at a test service. Use a protected test
variant/environment and licence tester accounts for real device acceptance.

New native purchase copy is currently English; native-language review and integration
with all 25 existing membership bundles remain before a multilingual release. No
overlapping-plan upgrade/downgrade purchase flow is offered; manage existing
subscriptions in Google Play. Account identity must remain available for consumed-pass
restore. Provider acceptance must cover all five plans, pending completion, network
loss after payment, reinstall/device changes, ownership isolation, purchase retries,
renewal, cancellation, grace/hold, expiry, refund/chargeback and RTDN delivery/replay.
Test catalogue GBP amounts and base-plan periods must be checked in Play; this code
does not change product prices. A paginated Voided Purchases API backfill also revokes known refunded/charged-back
tokens. Drain all pages within Google's 30-day history window. Reconciliation
currently handles stored tokens; it is not a complete financial audit service.
Unknown/unclaimed tokens still require Google verification on first claim.

Embedded signing passwords were replaced by environment configuration and the copied
keystore was removed from this branch. The original Git history still contains it;
removal does not rotate or erase an exposed key. The owner should review upload-key
exposure/reset through Play's normal process before release. No key rotation occurred.
Capacitor sync requires JDK 21; the old machine-specific JDK 17 override was removed.
Release builds now require MEDICEA_KEYSTORE_PATH, MEDICEA_KEYSTORE_PASSWORD,
MEDICEA_KEY_ALIAS and MEDICEA_KEY_PASSWORD. Do not use the historical embedded values.
Choose a new versionCode greater than the latest Play upload only when preparing the
actual reviewed release. Current candidate version code is 16; verify it against Play.

A signed local AAB has been prepared in the follow-up above. No publication, deployment,
real purchase, live provider credential use, production billing activation, remote branch
push or merge has occurred.

Official references: https://developer.android.com/google/play/billing/integrate,
https://developer.android.com/google/play/billing/security and
https://developer.android.com/google/play/billing/rtdn-reference.

## Complimentary access (private Preview)

The owner manages `/membership/complimentary` through the Account page. Add an
email and optional private note; access has no expiry. Revoke with the two-step
Remove access confirmation. The recipient must sign in using that verified email.
Only the exact verified account configured by `MEDICEA_MEMBERSHIP_ADMIN_EMAIL`
can list or modify grants. No default owner and no client-provided roles are used.
Configure this variable only for `feature/google-play-billing` Preview. The owner
selected `sergio@medicea.global`; this is separate from any other signed-in account.

Migration 004 adds complimentary_access and an append-only application audit table
in the dedicated billing schema, plus new status/reservation overloads. Apply the
pinned `scripts/apply-complimentary-test-migration.cjs` to medicea-billing-test only.
Existing paid entitlements, trial records and medical data are not modified. Grants
are checked server-side on every access check and reservation; no expiry or quota
is applied, but the existing three-concurrent-request protection remains. Revocation
blocks new complimentary reservations; an already-authorised request can finish.
Email changes require granting the new verified address. Grants also work before
someone first registers. Notes and the list are never returned by public status.

Complimentary accounts see a soft green status and no plan selection or upgrade
prompt on web/Android. Existing paid subscriptions remain renewable until cancelled;
the account retains management links. Adding a grant never cancels or refunds a
payment. No invitation emails are sent. The audit retains the actor, target email,
note, action and timestamp for accountability; production retention/erasure review
is still required before launch. Production membership remains disabled.
