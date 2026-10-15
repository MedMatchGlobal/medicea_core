# OpenAI model upgrade — isolated Preview preparation

Requested by the owner on 15 October 2026. This branch is based on `feature/monetisation-preview`; it is a separate opt-in experiment, not an activation or a Production migration. **DO NOT ACTIVATE: live tests found medical-output blockers.** Do not merge into main or change deployment environment variables until output-quality acceptance passes and the owner approves rollout.

## Verified sources

- [API deprecations](https://developers.openai.com/api/docs/deprecations): GPT-4o, GPT-4o mini and GPT-4.1 variants retire on 14 January 2027. The official replacement recommendation is GPT-6 Luna. GPT-4 is also a legacy model; do not infer its shutdown date from the four-model email.
- [Current models](https://developers.openai.com/api/docs/models): Astra is the quality-first model, GPT-6.1 Sol is the balanced option, and Luna is the efficient option. The latest-model resolver returned `gpt-6-astra`.
- [Migration parameters](https://developers.openai.com/api/docs/guides/latest-model#update-api-and-model-parameters): Chat Completions without tools remains supported; Astra requires reasoning, and reasoning requests cannot carry sampling parameters. The model-specific Markdown URL failed twice, so compatibility was checked against the fetched current family guide and the OpenAI Docs skill's bundled migration workflow. No prompt changes were required.

## Inventory and candidate mapping

| Existing usage | Request role | Candidate |
| --- | --- | --- |
| `gpt-4` in general medical generation and triage | Medical text | Luna, reasoning none; quality acceptance pending |
| `gpt-4o` in human equivalents/generics, pet equivalents/generics, leaflets, veterinary information and condition search | Composition extraction, matching, JSON/text generation; some embedded translation passes | Luna, reasoning none; quality acceptance pending |
| `gpt-4o-mini` in translation, JSON translation and ping | Fast translation/diagnostics | Luna, reasoning none |
| Explicit snapshot pins or other `OPENAI_MODEL` overrides | Intentional configuration | Unchanged; review individually |

All these active generation routes use `app/lib/openaiClient.ts`. There are no tools or upstream streaming requests in the inventoried routes. The existing `OPENAI_MODEL` override applies to standalone translation/condition routes, not every hardcoded medical route. Changing that variable alone would leave retiring models active.

The initial quality-first candidate was Astra; Sol and Luna were compared after timeouts. Luna now defaults in the isolated opt-in adapter because it completed the sample within existing limits, consistent with the official deprecation recommendation. `MEDICEA_OPENAI_MEDICAL_MODEL` can explicitly select `gpt-6-luna`, `gpt-6.1-sol` or `gpt-6-astra` for further evaluation; typos fail explicitly. Translation/ping stays Luna. This is not evidence of accepted medical quality or a reason to enable the flag.

## Implementation and activation

`MEDICEA_OPENAI_UPGRADE=true` opts into the transport adapter only on Vercel Preview, or local development without VERCEL_ENV. Production always keeps the original request, even if the switch is true. With the switch absent/false, the original request is passed verbatim. No hosted environment settings have been changed.

The adapter maps only the three legacy aliases above; preserves message text, roles, response formats and downstream parsers; removes the legacy seed hint; preserves sampling for Luna without reasoning and removes it for Astra/Sol reasoning; and converts `max_tokens` to `max_completion_tokens` without increasing the budget. Tool/stream requests fail explicitly rather than being silently converted. The original routes, protected prompt baseline, key failover, timeouts (10 seconds per attempt / 25 seconds per request), matching filters, membership and storage behavior are unchanged. No provider SDK upgrade or Responses endpoint conversion is needed for this preparation.

Important evaluation gates: Astra reasoning shares the existing completion budget, including the condition route's 900-token limit. Confirm complete visible output rather than accepting a 200 response, and measure whether the existing timeouts are sufficient before enabling the flag. Do not silently raise budgets/timeouts, bypass membership, or weaken the protected prompts to make tests pass. Removing seed and sampling means output reproducibility changes; exact medicine composition and unsupported-product cases require representative evaluation.

Rollback: unset the Preview flag and redeploy; no schema or data migration is involved. The old aliases are suitable only as a temporary rollback before their retirement. A supported replacement must be accepted before the deadline.

## Validation status

51 offline tests pass, including four migration tests and the unchanged refined prompt baseline. The optimized Next.js build passes. No prompt baseline was regenerated. Existing generic software compatibility checks established account access to Astra/Luna, not application quality.

The owner explicitly approved live comparison in this chat after automatic review initially blocked it. Tests used public medicine names and synthetic fixtures, one existing server key in memory, no copied credentials and no patient records. Route handlers ran directly with membership stubbed: this is not browser/payment acceptance.

| Profile | Four-case structural smoke | Observation |
| --- | --- | --- |
| Existing GPT-4o/mini | 4/4 | Human match 3.08s; veterinary summary 2.85s; translation 0.83s; condition 2.87s |
| Astra medical / Luna translation | 2/4 | Human match 14.10s; veterinary and condition timed out at 10s per attempt |
| Sol medical / Luna translation | 2/4 | Human match 11.88s; veterinary and condition timed out at 10s per attempt |
| Luna without reasoning | 4/4 | Initial human match 4.16s; veterinary 2.11s; translation 1.22s; condition 5.73s |

A subsequent Luna run checked 10 application cases and 25 small JSON translation fixtures: 35/35 passed the initial **structural** checks, with complete upstream stop reasons and preserved keys/tags/placeholders/nested numbers. This only establishes schema/transport compatibility; the translation fixture does not validate an entire language's medical prose. Subsequent content review found:

- **Leaflet blocker:** both English and Italian Panadol responses declined to fetch/verify an official leaflet rather than returning the expected information. Nonempty JSON was an insufficient success criterion. The live evaluator now rejects these refusal patterns; the observed replies fail that quality gate. Do not force fabricated leaflet retrieval by weakening the prompt.
- **Matching blocker:** the Co-codamol 8/500 case produced unverified `Solpadeine Plus` suggestions. A targeted baseline comparison also returned `Solpadeine Tablets`. The [HPRA record](https://www.hpra.ie/find-a-medicine/for-human-use/authorised-medicines/details/25370) lists caffeine as an additional active ingredient in that authorised formulation. The baseline already has a matching-verification gap; matching two named components does not establish an exact full-composition equivalent. The new model does not resolve that gap.
- **Coverage limitation:** unknown veterinary product returned NOT_FOUND_ORIGIN, pet composition and basic translated formatting were usable, but broad medicine availability, exact formulations and clinical accuracy have not been accepted. The simple triage fixture is not a validation of the entire triage workflow.

Evidence metadata (no prompts, keys or full medical text): `tests/fixtures/model-upgrade-live-summary.json`. Manual reproducible runner: `scripts/evaluate-model-upgrade.cjs legacy|astra|sol|luna [extended]`, requiring OPENAI_API_KEY in its execution environment. It makes charged live API requests; run only with authorisation. It reads the existing route prompts without editing them, suppresses route logs, outputs metadata only and writes its report under the system temporary directory. A passing structural run still requires content and regulator-source review. Some timed-out calls may still incur upstream charges; successful-response token counts alone are not the total bill.

Before activation, address source-backed full-composition verification and the leaflet retrieval/information contract in separately reviewed work; the owner's prompt/matching-preservation instruction prevents silently rewriting those flows as part of this transport experiment. Then repeat representative human/pet/leaflet/triage acceptance and failure, rate-limit and cost checks. Current Preview/public deployments and private-vault branch are unchanged; the upgrade flag remains off.
