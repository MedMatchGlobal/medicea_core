# OpenAI model upgrade — isolated Preview preparation

Requested by the owner on 15 October 2026. This branch is based on `feature/monetisation-preview`; it is a separate opt-in experiment, not an activation or a Production migration. Do not merge into main or change deployment environment variables until representative output/latency evaluation has passed and the owner approves rollout.

## Verified sources

- [API deprecations](https://developers.openai.com/api/docs/deprecations): GPT-4o, GPT-4o mini and GPT-4.1 variants retire on 14 January 2027. The official replacement recommendation is GPT-6 Luna. GPT-4 is also a legacy model; do not infer its shutdown date from the four-model email.
- [Current models](https://developers.openai.com/api/docs/models): Astra is the quality-first model, GPT-6.1 Sol is the balanced option, and Luna is the efficient option. The latest-model resolver returned `gpt-6-astra`.
- [Migration parameters](https://developers.openai.com/api/docs/guides/latest-model#update-api-and-model-parameters): Chat Completions without tools remains supported; Astra requires reasoning, and reasoning requests cannot carry sampling parameters. The model-specific Markdown URL failed twice, so compatibility was checked against the fetched current family guide and the OpenAI Docs skill's bundled migration workflow. No prompt changes were required.

## Inventory and candidate mapping

| Existing usage | Request role | Candidate |
| --- | --- | --- |
| `gpt-4` in general medical generation and triage | Medical text | Astra, low reasoning |
| `gpt-4o` in human equivalents/generics, pet equivalents/generics, leaflets, veterinary information and condition search | Composition extraction, matching, JSON/text generation; some embedded translation passes | Astra, low reasoning |
| `gpt-4o-mini` in translation, JSON translation and ping | Fast translation/diagnostics | Luna, reasoning none |
| Explicit snapshot pins or other `OPENAI_MODEL` overrides | Intentional configuration | Unchanged; review individually |

All these active generation routes use `app/lib/openaiClient.ts`. There are no tools or upstream streaming requests in the inventoried routes. The existing `OPENAI_MODEL` override applies to standalone translation/condition routes, not every hardcoded medical route. Changing that variable alone would leave retiring models active.

The quality-first medical candidate is deliberately stronger than the deprecation page's Luna recommendation. This is a starting experiment, not evidence that Astra is the best production choice. Compare Luna/Sol if Astra does not meet the existing quality, latency and cost requirements. Do not move the fast tier to Astra globally.

## Implementation and activation

`MEDICEA_OPENAI_UPGRADE=true` opts into the transport adapter only on Vercel Preview, or local development without VERCEL_ENV. Production always keeps the original request, even if the switch is true. With the switch absent/false, the original request is passed verbatim. No hosted environment settings have been changed.

The adapter maps only the three legacy aliases above; preserves message text, roles, response formats and downstream parsers; removes the legacy seed hint; removes sampling parameters for Astra reasoning; and converts `max_tokens` to `max_completion_tokens` without increasing the budget. Tool/stream requests fail explicitly rather than being silently converted. The original routes, protected prompt baseline, key failover, timeouts (10 seconds per attempt / 25 seconds per request), matching filters, membership and storage behavior are unchanged. No provider SDK upgrade or Responses endpoint conversion is needed for this preparation.

Important evaluation gates: Astra reasoning shares the existing completion budget, including the condition route's 900-token limit. Confirm complete visible output rather than accepting a 200 response, and measure whether the existing timeouts are sufficient before enabling the flag. Do not silently raise budgets/timeouts, bypass membership, or weaken the protected prompts to make tests pass. Removing seed and sampling means output reproducibility changes; exact medicine composition and unsupported-product cases require representative evaluation.

Rollback: unset the Preview flag and redeploy; no schema or data migration is involved. The old aliases are suitable only as a temporary rollback before their retirement. A supported replacement must be accepted before the deadline.

## Validation status

50 offline tests and the optimized Next.js build pass, including three migration tests, unchanged refined prompt baseline, JSON/placeholder contracts, quotas and Production-off behavior. Two real, generic software-test requests returned 200 with valid JSON from `gpt-6-astra` and `gpt-6-luna` using the existing API account (approximately 4.9s / 1.4s respectively; not representative latency benchmarks).

Full live-route evaluation has not run. Automatic approval review rejected sending proprietary application prompts and derived example queries to the OpenAI API without specific user approval. Approval was requested in this chat. No real patient records are needed for that comparison. Offline tests and basic model availability do not establish medical accuracy, matching completeness, all-language output quality, cost or production readiness.

Remaining acceptance: human single/multi-ingredient and no-match searches, exact strengths/formulations, pet composition and no-human-substitution cases, included leaflets, all 25 output languages/JSON placeholders, triage and condition formatting, cancellation/timeouts/rate limits, actual token cost, and old/new side-by-side review. Current Preview/public deployments and private-vault branch are unchanged.
