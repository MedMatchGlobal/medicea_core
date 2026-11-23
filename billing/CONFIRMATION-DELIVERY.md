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

## Acceptance still required

1. SMTP handshake using the stored secret, with no messages sent.
2. An explicitly authorized test recipient receives a sample confirmation and
   its text attachment; inspect sender, Reply-To, SPF/DKIM/DMARC and spam handling.
3. A dedicated QA pass, scheduled upgrade, initial subscription and renewal
   exercise verified provider event -> immutable queue -> SMTP -> download.
4. Duplicate events yield one queue entry; temporary connection failures retain
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
