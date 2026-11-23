# Data inventory and remaining privacy decisions — 23 November 2026

Code/configuration evidence only. No patient record, medical/vault database,
private mailbox or health-input log was inspected. This is a preparation record,
not a completed DPIA, legal opinion or declaration of regulatory compliance.

| Flow | Evidence and current data | What still needs confirmation |
| --- | --- | --- |
| Billing account | Separate Supabase billing Auth; verified email, account ID/dates, selected home country. Dedicated billing test DB in London region. | Production project, Auth retention and processor agreement; account closure/session revocation procedure. |
| Payments | Stripe customer binding, actual purchases/currency/tax, subscription/schedule references; Google Play purchase verification records. Cards remain with payment provider. | Accountant's retention/invoice/credit-note requirements; provider terms and transfer safeguards. |
| Owner console | Separate owner-only app, recent MFA, necessary account and billing detail, append-only operation audit. No raw auth secrets or Play purchase tokens. | Restricted Stripe key replacement and documented operator/recovery/retention practice. |
| Supporting tools | Translation request passes through the existing model transport. New DB stores only account ID, current bucket timestamps and counters. | Lawful basis/special-category condition where text identifies a person, provider contractual retention and transfer settings. |
| AI generation | app/lib/openaiClient.ts calls the existing Sonnet/Claude preview transport when enabled; legacy transport is separately retained. Do not infer provider terms from model names. | Record actual account/contract settings, permitted health-input handling, retention and transfer mechanism for every deployed environment. |
| Browser data | Saved medicine searches in localStorage; language, country and device/usage preferences; session return/form drafts in sessionStorage. | Final notice must distinguish local removal from server deletion and explain shared-device exposure and backup/sync assumptions. |
| Confirmations/email | New immutable English commercial snapshot plus recipient email in private billing DB; planned SMTP through existing billing mailbox. No mail enabled yet. | SMTP/inbox acceptance, mailbox access/retention, delivery failures, retention period and reviewed policy translations. |
| Hosting/network | Vercel processes HTTP/network metadata; Google Fonts connections remain; Analytics script removed from app layout. | Actual log/access settings and retention, processor contracts, transfers and a final cookie/storage inventory. |
| Medical/patient portal | prisma/schema.prisma declares profile/address, emergency-contact and clinical fields. A schema declaration alone does not prove a feature is deployed or processing records. | Separate portal/deployment review and data-flow inventory before publishing any claim about these records. Do not infer health records are absent because billing is isolated. |

Decisions still needed before public use:

- Establish the lawful basis and any required special-category condition for each
  identifiable health-data flow, with appropriate professional review.
- Verify actual processor/subprocessor agreements, storage/processing locations,
  account-specific retention and international-transfer safeguards.
- Approve explicit retention periods and erasure exceptions by category; do not
  invent an automated medical-record purge as part of billing work.
- Review the final notice in each advertised contract language. English draft
  supplements and an automated translation are not a completed legal review.
- Complete medical prompt testing and regulatory assessment separately. Neither
  a tax code, a working sandbox nor Play approval establishes medical clearance.
