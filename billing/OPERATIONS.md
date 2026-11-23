# Billing operations

These procedures describe the protected Stripe sandbox preview. Production billing
remains disabled. The accountant's tax answers and the regulatory response remain
pending; this document is not tax or regulatory clearance.

## Before acting on a purchase

- Confirm the Stripe account, sandbox/live indicator, customer, original purchase,
  currency and amount. Sandbox testing must use isolated QA customers only.
- Identify whether the purchase is an immediate pass, a future reserved pass or a
  recurring subscription. A reserved setup is an authorisation, not a payment.
- Preserve the original paid-access expiry and the provider transaction record.
  Never grant access by editing the billing ledger to simulate a provider event.

## Cancel a future reservation

Use the account's cancellation action before the reserved start. The future invoice
is disarmed or the future subscription schedule is cancelled. The existing paid
pass and saved searches remain intact. No refund is needed when no money was taken.
Check that the reservation disappears after a fresh account load.

## Refund a paid purchase

The approved access policy is:

- A successful full refund removes access attributable to that purchase.
- A partial refund retains access through the original expiry.
- Refunding a historical subscription invoice does not remove a later paid period.
- A refund does not cancel a recurring subscription. Handle cancellation separately
  when requested, checking any scheduled changes and future renewal date.

For an invoiced purchase, use Stripe's credit-note workflow when a customer credit
document is required. A credit note can generate the refund with `refund_amount`.
If a refund was already issued, associate that existing refund with the credit note;
do not issue a second cash refund. Confirm the refund's final status. Failed or
pending refunds require follow-up and must not be described as completed.

Stripe documents automatic proportional tax adjustments for refunds of invoices
using Stripe Tax. A linked refund and credit note represent one adjustment, not two.
Do not manually reverse the same VAT a second time. Retain the original invoice,
refund and credit note references for reconciliation. Confirm document requirements
and reporting treatment with the accountant before live sales.

Reference: [Stripe Tax refunds and credit notes](https://docs.stripe.com/tax/invoicing/refunds).

## Disputes

An open or lost dispute suspends access tied to the disputed purchase. A won dispute
or closed inquiry can restore eligible access only through the original expiry.
It must not restart the pass. Check the fresh provider state, correct customer
binding and current billing period before interpreting the account status.

## Payment history and invoice details

The account's Payments and receipts section lists successful customer-owned charges
in their actual purchase currency, including refund amounts and Stripe receipt links.
Receipt history is independent of access. A one-time Checkout payment does not
necessarily have an invoice; do not create chargeable invoices merely to populate
history. Reserved passes use invoices, and subscriptions generate invoices.

Current advertised totals include applicable VAT. The UK sandbox check for a
£2.99 total returned £2.49 excluding tax and £0.50 VAT, `standard_rated`.
Existing settled invoices and subscriptions were not migrated. New taxed invoice
flows set an owned-customer supplier footer containing the legal name, company
number, supplied VAT number and registered address, preserving existing notes and
payment settings. Display was verified on a Stripe-generated sandbox PDF and a
monthly invoice preview. This does not register a structured Stripe account tax ID
or independently validate the VAT number. The accountant still needs to review the
legally required invoice/credit-note particulars before live billing.

## Webhook and recovery checks

The signed webhook and scheduled recovery share the same validated event processor.
Check the owned purchase's entitlement and original expiry after an event. Replays
must not duplicate an entitlement or extend access. A payment failure must not
grant access. The private recovery scheduler runs in `medicea-billing-test` only;
its credentials stay encrypted in that project's Vault and must never appear in
logs or documents. Never use the medical database for billing operations.

If recovery reports more pages, let it continue. A failed page must be retried before
advancing the checkpoint. An outage longer than Stripe's retained event window
requires manual provider-to-ledger reconciliation; recovery is not proof that every
historical purchase has been reviewed.

## Remaining release checks

- Complete a signed-in browser checkout, return to the account, then refresh and
  verify purchase history and the correct entitlement.
- Exercise a taxed future subscription schedule at the provider and inspect its
  resulting subscription and invoice; local tests alone do not prove that flow.
- Obtain the accountant's classification, overseas-sales, invoice and reporting
  answers. Configure and verify live tax settings separately when authorised.
- Complete Google Play device/provider acceptance, final consumer/fair-use review,
  the separate regulatory review and explicit production launch approval.

The Stripe product category does not determine medical-device classification.
