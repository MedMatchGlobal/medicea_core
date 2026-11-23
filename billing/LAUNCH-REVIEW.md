# Launch review — 23 November 2026

This is an evidence and action register, not a production approval. Billing stays
preview-only. The medical prompts, model settings, matching and provider routing
have not been changed by this review. Voucher implementation remains on hold.

## Completed in this review

- The owner confirmed support@medicea.global is monitored for support, refunds
  and privacy requests.
- The owner approved a voluntary full refund within 14 days of an initial pass
  or subscription purchase. Renewal refunds are considered individually;
  statutory rights remain. Published the policy in all 25 account languages.
- Removed Google Analytics from the application layout. The unused historical
  tracker is not mounted. Google Fonts remains and is disclosed; this is not a
  claim that the app makes no external requests.
- Corrected the preview's generated-information provider disclosure to Anthropic
  (Claude). Production's provider configuration is not changed.
- Added an explicitly English draft supplement covering future reservations,
  personal/manual use, concurrency, the controller, privacy requests, retention
  criteria, browser removal and ICO complaints. Removed the unfinished fair-use
  placeholder. The supplement does not claim full privacy compliance.
- Preview /terms now leads to the preview information, rather than legacy terms
  asserting the app processes no personal medical information. The production
  legacy terms are preserved until a reviewed public replacement is approved.
- Supporting translation endpoints now check account identity and request origin
  in the billing preview, limit inputs and conceal upstream error details. They
  remain included tools, not additional metered medicine searches.
- Corrected stale account-management and care-search test fixtures. Historical
  comparison reads normalize Windows line endings without changing any protected
  baseline, prompt or model setting.

## Support and refund procedure

1. Verify the requester through the signed-in account or its verified email. Do
   not request card numbers, sign-in codes or patient records by email.
2. Locate the exact provider purchase and actual settled amount/currency. A card
   setup or future reservation is not a paid purchase. For the voluntary policy,
   measure the 14 days from the initial successful payment, not card saving.
3. Within the approved initial-purchase window, refund the full amount actually
   paid, without deducting a usage or administration fee. Handle renewals outside
   this promise individually, preserving statutory rights.
4. Confirm whether the customer also wants renewal stopped. A refund and
   cancellation are separate actions; never leave an unwanted renewal active.
   An unpaid future reservation can be cancelled without issuing a cash refund.
5. Use the provider's refund workflow: Stripe for Stripe purchases, Google Play
   for Play purchases. Check pending/failed outcomes before saying it completed.
   Follow OPERATIONS.md for invoice/credit-note and VAT reconciliation.
6. Record the request, decision, reason, amount, provider reference and result in
   a restricted support record. Do not put private correspondence in Git or
   public Stripe metadata. Check the resulting entitlement and original expiry.
   Full refunds revoke that purchase; partial refunds keep its access. This
   operational policy is separate from the customer's statutory rights.

## Privacy request procedure

Log receipt and deadline; acknowledge via the confirmed support inbox. Verify
identity proportionately. Explain correction, access/export, erasure, restriction,
objection and consent-withdrawal options as applicable to the processing involved.
Escalate unclear legal exceptions rather than promising unconditional erasure.

Prepare an account-specific inventory of authentication, billing, entitlements,
usage counts and complimentary grants. Avoid bulk exports of other accounts.
Separate any financial/dispute records requiring retention and explain why they
cannot yet be erased. The billing test database contains no medicine search text;
this does not imply the entire product processes no health-related input.

Coordinate account closure with provider cancellation to prevent further renewal.
Do not delete identity bindings first and strand a recurring subscription. Apply
approved changes through the relevant system and record completion or exceptions.
Tell the user how to remove saved searches and clear site data on each device;
server-side deletion cannot do that remotely. No automatic erasure job, retention
purge, account deletion or deletion of the medical database was authorized here.

## Remaining technical and policy work before public billing

- **Durable contract confirmation:** implement versioned purchase/reservation
  confirmation containing seller details, plan, exact price/currency, VAT terms,
  start/end or renewal terms, cancellation and refund information. Deliver it in
  a form the customer can retain; verify initial purchases, reservations and
  renewals, retries and duplicate events. The versioned English snapshot, immutable outbox, signed-in download and SMTP
  worker are now implemented behind an OFF preview flag. Actual SMTP/inbox and
  purchase-to-email acceptance remain pending. See CONFIRMATION-DELIVERY.md.
  A generic Stripe receipt alone is not proof of a complete confirmation.
- **Privacy completion:** confirm the lawful basis and special-category condition
  for identifiable health inputs, actual processor terms/retention, international
  transfers and safeguards. Complete a product-wide data inventory, including
  patient-portal features, before calling the notice complete. The preview
  supplement is an honest draft, not a substitute for these decisions.
- **Translation review:** the new reservation/privacy supplement is explicitly
  English. Review and translate the final public policy and reservation screens
  before advertising those contract languages. Do not silently substitute the
  misleading legacy public terms.
- **Abuse controls:** the billing preview now has an atomic per-account supporting-
  translation budget shared by both translation endpoints and all server instances:
  12 calls/minute, 120/hour, 600/UTC day, 128,000 input characters/hour and
  512,000/day. Valid upstream attempts count even if the provider fails. No medical
  text is stored; medicine-search quota and protected generation are unchanged.
  Production enablement remains a separate release gate.
- **Provider/device acceptance:** complete Google Play purchase, restore,
  cancellation, renewal, refund and notification tests on-device. Provider
  approval alone is not evidence of this flow.
- **Future subscription activation:** the owner's saved-card schedule and invoice
  preview are verified, but its future automatic activation/charge has not yet
  occurred. Keep the reservation intact unless the owner requests cancellation.

## External or separately authorized gates

Accountant answers on tax classification, overseas VAT and invoices; separately
authorized live Stripe setup and verification; Google Play acceptance; medical
prompt testing and the separate regulatory assessment; explicit production launch
approval. EMA's outstanding response is not a clearance. The tax code is not a
medical-device classification.

## Separate owner billing console — requested next

Build as a separate private admin application, not a hidden customer-app page.
Require owner authorization and MFA server-side on every read and write. Use a
dedicated least-privilege service credential, no medical database access, strict
cross-origin boundaries, no shared customer-session privilege, no analytics and
an append-only audit record. Sandbox first; live operations remain disabled.

The console should search all authorized accounts with pagination, show necessary
account details, current and future plans, complete paginated purchases and refund
history, and support a chosen refund amount in the purchase currency, capped at
the remaining refundable balance. It must distinguish Stripe and Google Play.
Use idempotency, explicit amount/reason confirmation and provider reconciliation.

Additional payment means a clearly described invoice or payment request approved
by the customer. Do not silently debit a saved card. Show the proposed charge and
tax treatment before creating/sending it. The user authorized this separate
sandbox build after discussing the design; no live refund or charge is authorized.

## Sources informing the review

- [GOV.UK online selling](https://www.gov.uk/online-and-distance-selling-for-businesses/online-selling)
  — pre-contract information and a retainable contract confirmation.
- [ICO privacy information](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-privacy-information-should-we-provide/)
  — purposes, lawful basis, recipients, transfers, retention criteria and rights.

These sources guide the checks; they do not establish the app's regulatory status.

## Additional verification — 23 November 2026

Owner console actual-provider financial acceptance passed; see
acceptance/owner-console-20261123.json. All dedicated QA charges were fully refunded,
unused Checkout links expired, audit verified and normal build command restored.
This included a real refund response-schema bug fix. Owner MFA/HTTP controls remain
covered separately from the internal operation/provider/database harness.

The owner selected billing@medicea.global as purchase-confirmation sender. Public
MX/SPF currently point to Private Email. Mailbox authentication and end-to-end
confirmation delivery remain unverified; an address alone is not SMTP credentials.

The separate privacy decision register is PRIVACY-INVENTORY.md; the explicit
not-yet-passed on-device matrix is PLAY-DEVICE-ACCEPTANCE.md. The owner confirmed
billing@medicea.global is a mailbox they can sign into. Its SMTP password must be
provided through a Sensitive Vercel variable, never this repository or chat.

Security scan: patched Next.js to 15.5.29 in both apps and its PostCSS parser to
8.5.33; removed the unused vulnerable legacy Capacitor asset generator and unused
AI SDK. The actual plain-fetch generation transport/prompts were not changed.
Moved type-only OpenAI SDK and Prisma CLI into development tooling; retained
Prisma Client at runtime. The private console dependency audit is clear. Residual
Prisma/OpenAI development/optional-peer advisories need a documented toolchain
assessment; do not interpret the patched runtime framework as full security
clearance. No force/major Prisma or provider SDK migration was applied.

Final local verification after these changes: 307/307 root regression tests and
7/7 console tests passed; both builds passed; protected prompt comparison passed.
Mobile fixture check confirmed one payment-history section with the authenticated
confirmation-download link and no horizontal overflow or browser runtime errors.
Reviewed 52 Next.js server trace manifests: Prisma CLI/config, deepmerge-ts,
effect, OpenAI SDK and Zod advisory packages were not present in those traces.
This narrows deployed exposure; it does not erase development-tool advisories.
SMTP remains OFF and no confirmation email was sent. Production stays disabled.

SMTP connection/TLS/authentication acceptance and one explicitly authorized
outbox-to-inbox test are now complete. The owner confirmed its text attachment
opened. See acceptance/confirmation-mail-20261123.json. Automatic customer mail
is still OFF; actual purchase-to-confirmation lifecycle acceptance and policy
translation/retention decisions remain pending. No additional test email is
authorized by the single-message test approval.
