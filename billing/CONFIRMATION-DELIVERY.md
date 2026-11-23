# Purchase-confirmation delivery — private preview

Status: implemented and tested with isolated fixtures; SMTP authentication and
actual inbox delivery are NOT verified. Sending is explicitly disabled.
This is not a completed legal/consumer-law review or a live billing release.

## What is prepared

- Immutable versioned English text for paid passes, paid subscription invoices
  (initial and renewal), and scheduled upgrades after verified setup completion.
- Seller identity, actual payment/currency/tax where available, paid period,
  recurring price, cancellation information, approved initial-purchase refund
  policy, support contact and a retained copy of those commercial terms.
- London display times, explicitly GMT in winter or BST in summer. Machine
  timestamps remain ISO instants in the private record.
- One queue row per provider reference/kind. Repeated webhook or recovery events
  cannot replace the captured document. A database trigger prevents later editing
  of the recipient, commercial snapshot or text.
- Downloads are inside the existing Payments and receipts section. The private
  API binds every list/download to the signed-in member. No public document URL.
- The existing authenticated Stripe reconciliation job drains up to ten pending
  confirmations after recovery. It does not depend on a browser return page.
- SMTP authentication/connection is verified before queue claims. An uncertain
  post-send outcome or expired processing lease is held for review rather than
  automatically resent. Stable Message-ID is helpful but does not make SMTP
  exactly-once. SMTP acceptance does not establish inbox delivery.
- These records contain billing terms and recipient email, not medical questions,
  searches, card numbers, passwords or provider authentication credentials.

## Required secure setup

The owner confirmed billing@medicea.global is a sign-in mailbox. The domain's
public MX and SPF currently point to Private Email. Reuse that mailbox; no new
mail-service purchase or DNS change was made.

In the **medicea-core** Vercel project's environment variables, add:

| Field | Value |
| --- | --- |
| Key | MEDICEA_BILLING_SMTP_PASSWORD |
| Value | The billing mailbox SMTP password (or provider-issued app password if used) |
| Type | Sensitive / Secret |
| Environment | Preview only |
| Branch | design/riviera-one-page |

Never put the password in chat, source control, NEXT_PUBLIC variables, screenshots
or logs. Server host mail.privateemail.com, port 465, verified TLS and username
billing@medicea.global are fixed in the server-side adapter. Reply-To is
support@medicea.global. No credential was read from the owner's email client.

After it is stored, the private build-only scripts/verify-billing-mail.cjs can
check connection, TLS and authentication without sending any message. It requires
the exact medicea-core project and Preview. Restore a normal build afterward.

Only after authentication and an authorized inbox-delivery test succeed should
MEDICEA_CONFIRMATIONS_PREVIEW be enabled. Set MEDICEA_CONFIRMATIONS_FROM_EPOCH to
the agreed activation instant then; older recovered purchases are excluded rather
than causing surprise retrospective emails. Production remains disabled.

## Acceptance status

1. Passed: SMTP connection/TLS/authentication using the stored secret.
2. Passed: one explicitly authorized test reached the recipient and its text
   attachment opened. This is not evidence of full SPF/DKIM/DMARC header review
   or broad spam/delivery acceptance.
3. Passed: genuine pass/upgrade records and dedicated monthly/annual initial and
   renewal invoices -> actual processing -> immutable snapshots and duplicate
   replay against hosted SQL, with mandatory rollback. A combined purchase ->
   queue -> SMTP -> signed-in download test remains separate and requires a
   specifically authorized message; no further email is currently authorized.
4. Passed: duplicate replay yielded one immutable queue entry. Still verify
   temporary connection failures retain
   pending items; ambiguous delivery outcomes remain reviewable. Check a worker
   crash after SMTP acceptance without blindly resending.
5. Verify cancellations/refunds separately. This first implementation does not
   yet mail separate cancellation/refund notices or cover Google Play receipts.
6. Complete the final policy-language review/translations and retention decisions.
   Do not advertise unreviewed translated confirmations as finalized contracts.

## Operator review

Use the dedicated billing database only. List state, reference, timestamps and
last_error for pending/processing/needs_review records. Do not bulk-export body
or recipients. For needs_review, inspect the sending mailbox/provider delivery
logs before any explicit resend; do not reset all rows to pending. Never edit an
old contractual snapshot to reflect a later policy change. Financial retention,
privacy rights, bounce handling and closure procedures remain launch-review work.

Sources:
- https://www.namecheap.com/support/knowledgebase/article.aspx/1179/2175/general-private-email-configuration-for-mail-clients-and-mobile-devices/
- https://nodemailer.com/smtp/
- https://www.gov.uk/online-and-distance-selling-for-businesses/online-selling

## SMTP connection acceptance — completed

The stored Sensitive Preview credential passed Vercel-hosted connection, TLS and
authentication verification in deployment dpl_CzAQs7oCwggkJDL2iRcK7cQTgRpu.
The check sent zero messages. Password was neither read back nor exposed.
An actual inbox-delivery test still needs an explicitly authorized recipient.

The prepared build-only scripts/send-billing-mail-test.cjs is restricted to the
exact app project and Preview. It sends only one explicitly labelled test to
sergio@medicea.global through the actual outbox worker, with a retained text copy.
It refuses existing/uncertain test attempts or another pending queue, and never
changes the runtime mail flag. Do not invoke without the owner's explicit approval
to send that message. SMTP acceptance still needs recipient inbox confirmation.

## One-message delivery acceptance — completed

The owner explicitly authorized one labelled test from billing@medicea.global to
sergio@medicea.global. The actual outbox worker obtained one SMTP acceptance at
21:50:41 GMT (London time) on 23 November 2026. The owner then confirmed receipt
and that the text attachment opened, with screenshots. No purchase, payment,
subscription or access change occurred. See acceptance/confirmation-mail-20261123.json.

The normal build command was restored afterward. Automatic customer mail remains
OFF. This test establishes one inbox/attachment delivery, not completion of every
provider-purchase lifecycle, final contract-language review or public launch.

## Real provider records -> retained snapshot acceptance

Two genuine completed Checkout events and their latest bound Stripe sandbox
records were verified against actual confirmation code and hosted billing SQL.
The seven-day purchase retained its EUR 1.79 paid price and original expiry.
The currently saved annual upgrade retained its GBP 19.99 schedule price, actual
start date, zero charge-now wording and recurring terms. Duplicate event replay
created one immutable snapshot per provider reference.

Every temporary document insert was inside a mandatory rollback transaction;
post-rollback absence was checked. Stripe mutations and SMTP invocation were
explicitly forbidden by the harness. Zero emails or account changes occurred.
See acceptance/real-confirmations-20261123.json for scope and test correction.
This closes those real-record capture/replay checks, not every recurring-invoice
or renewal scenario, final translations, or public launch.

## Recurring invoice acceptance — 23 November 2026

Dedicated email-less monthly and annual Stripe sandbox customers passed actual
paid first invoices and test-clock renewals: GBP 2.99 including GBP 0.50 VAT,
and GBP 19.99 including GBP 3.33 VAT. Actual event-processing and confirmation
code updated access, retained the provider period/amount/renewal terms and
created one immutable document on duplicate replay in hosted SQL.

The verified QA recipient rows and documents existed only inside mandatory
rollback transactions; no permanent Auth account or confirmation was created.
No SMTP transport was invoked. Both temporary subscriptions were cancelled;
all four test charges were fully refunded and QA access reconciled inactive.
See acceptance/recurring-confirmations-20261123.json. These were test envelopes
containing actual paid provider invoices, not signed HTTP webhook delivery,
customer signup, browser Checkout or an additional inbox test.

Automatic customer mail remains OFF. The previous single authorized delivery
test does not authorize further emails. Final contract-language and retention
decisions, production configuration and end-to-end launch acceptance remain open.
