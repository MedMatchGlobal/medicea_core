# Google Play on-device acceptance — pending

No adb/device connection was available in this session. Automated backend tests
are not evidence of a Play Store-installed application completing these flows.
Use the authorized test track and license-tester account, never a live payment.
Record package version, tester, provider order/reference, expected and actual
outcome, and evidence; do not put purchase tokens or credentials in Git.

| Test | Required evidence |
| --- | --- |
| 7/14/30-day pass and monthly/annual purchase | Correct localized price and provider confirmation; exactly one matching entitlement. |
| User cancels checkout / payment fails / pending payment | No paid access granted before verified completion; clear recovery UI. |
| Restore/reinstall/second device | Same signed-in account restores the existing purchase; another account cannot claim it. |
| Renewal and failed renewal | Latest provider state drives access and expiry; no duplicate or extended period after replay. |
| Cancellation | Renewal stops through Google Play; existing access lasts to its original end date. |
| Full refund / revoke / void | Correct access removal and no later stale notification restores revoked access. |
| Partial refund if supported for that purchase | Actual provider workflow and unchanged remaining access policy; never use Stripe for Play refunds. |
| Delayed/duplicated/out-of-order RTDN | Verified latest state wins; retries/reconciliation recover missed messages. |
| Play unavailable / server outage | No entitlement fabricated; safe error and restoration/recovery path. |
| Branding / external links | Updated binary assets installed; account/legal/support links work; applicable Play billing rules respected. |

Nothing in this matrix is marked passed without actual device/provider evidence.
The future owner Stripe schedule must not be cancelled or refunded for these tests.
