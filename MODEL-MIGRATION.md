# OpenAI model upgrade — isolated Preview preparation

**Current owner-test activation:** the owner subsequently requested an accessible revised-prompt test. Only Vercel Preview for `feature/openai-model-upgrade-preview` now defaults on, with a visible `exact-match-v2` banner; explicit `MEDICEA_OPENAI_UPGRADE=false` still disables it. Human equivalents/generics default to a separate, labelled **unverified prompt experiment**, not the source-grounded pilot described below. See `MODEL-TEST.md` for the current test instructions, limits, observed failures and source-mode switch. Earlier "flag off" observations below describe the preceding preparation stage. Production and other branches are unchanged.

Requested by the owner on 15 October 2026. This branch is based on `feature/monetisation-preview`; it is a separate opt-in experiment, not a Production migration. The owner subsequently authorised the targeted summary and full-composition/source fixes below. **Private QA only: do not activate globally or merge into main.** Source-country coverage and broader quality/clinical acceptance remain launch gates.

## Verified sources

- [API deprecations](https://developers.openai.com/api/docs/deprecations): GPT-4o, GPT-4o mini and GPT-4.1 variants retire on 14 January 2027. The official replacement recommendation is GPT-6 Luna. GPT-4 is also a legacy model; do not infer its shutdown date from the four-model email.
- [Current models](https://developers.openai.com/api/docs/models): Astra is the quality-first model, GPT-6.1 Sol is the balanced option, and Luna is the efficient option. The latest-model resolver returned `gpt-6-astra`.
- [Migration parameters](https://developers.openai.com/api/docs/guides/latest-model#update-api-and-model-parameters): Chat Completions without tools remains supported; Astra requires reasoning, and reasoning requests cannot carry sampling parameters. The model-specific Markdown URL failed twice, so compatibility was checked against the fetched current family guide and the OpenAI Docs skill's bundled migration workflow. No prompt changes were required.

## Inventory and candidate mapping

| Existing usage | Request role | Candidate |
| --- | --- | --- |
| `gpt-4` in general medical generation and triage | Medical text | Luna, reasoning none; quality acceptance pending |
| `gpt-4o` in human/pet equivalents/generics | Origin/candidate composition research | Gated new path: GPT-6.1 Sol, low reasoning, Responses with mandatory restricted web search |
| `gpt-4o` in human leaflets | Educational medicine summary | Gated new path: Luna, reasoning none, required JSON sections and visible AI-information notice |
| `gpt-4o` in veterinary information and condition search | Existing JSON/text generation | Luna, reasoning none; broader quality acceptance pending |
| `gpt-4o-mini` in translation, JSON translation and ping | Fast translation/diagnostics | Luna, reasoning none |
| Explicit snapshot pins or other `OPENAI_MODEL` overrides | Intentional configuration | Unchanged; review individually |

All these active generation routes use `app/lib/openaiClient.ts`. There are no tools or upstream streaming requests in the inventoried routes. The existing `OPENAI_MODEL` override applies to standalone translation/condition routes, not every hardcoded medical route. Changing that variable alone would leave retiring models active.

The initial quality-first candidate was Astra; Sol and Luna were compared after timeouts. Luna now defaults in the isolated opt-in adapter because it completed the sample within existing limits, consistent with the official deprecation recommendation. `MEDICEA_OPENAI_MEDICAL_MODEL` can explicitly select `gpt-6-luna`, `gpt-6.1-sol` or `gpt-6-astra` for further evaluation; typos fail explicitly. Translation/ping stays Luna. This is not evidence of accepted medical quality or a reason to enable the flag.

## Implementation and activation

`MEDICEA_OPENAI_UPGRADE=true` opts into the transport adapter only on Vercel Preview, or local development without VERCEL_ENV. Production always keeps the original request, even if the switch is true. With the switch absent/false, the original request is passed verbatim. No hosted environment settings have been changed.

The Chat adapter maps only the three legacy aliases above; removes the legacy seed hint; preserves sampling for Luna without reasoning and removes it for Astra/Sol reasoning; and converts `max_tokens` to `max_completion_tokens` without increasing the budget. Unrelated Chat tools/stream requests fail explicitly rather than being silently converted. Legacy route prompts and the protected baseline remain intact and execute when the flag is off or in Production.

The approved gated matching path now uses `source-matches.ts` through Responses and `web_search`: the first request establishes an origin from allowed product/regulator sites, the second researches target-country candidates using that established composition. `MEDICEA_OPENAI_SOURCE_MODEL` defaults to `gpt-6.1-sol` after positive international testing; `gpt-6-luna` is available for evaluation. `store:false`, mandatory search, low search context and returned source metadata are explicit. The client accepts this second endpoint only while the upgrade flag is enabled in Preview/local development. Existing Chat timeouts remain 10s/25s; the new research endpoint has a 40s attempt/45s request budget and the two-stage helper has a 55s overall cancellation limit, within the matching route's 60s allowance. Timeout, incomplete or missing evidence returns an error, never raw suggestions. No schema or provider SDK upgrade was required. Original membership enforcement and complete-search follow-up grants remain in place.

Important evaluation gates: Astra reasoning shares the existing completion budget, including the condition route's 900-token limit. Confirm complete visible output rather than accepting a 200 response, and measure whether the existing timeouts are sufficient before enabling the flag. Do not silently raise budgets/timeouts, bypass membership, or weaken the protected prompts to make tests pass. Removing seed and sampling means output reproducibility changes; exact medicine composition and unsupported-product cases require representative evaluation.

Rollback: unset the Preview flag and redeploy; no schema or data migration is involved. The old aliases are suitable only as a temporary rollback before their retirement. A supported replacement must be accepted before the deadline.

## Validation status

57 offline tests pass, including migration isolation, full-composition/source and evidence-link tests and the unchanged refined prompt baseline. The optimized Next.js build passes. No prompt baseline was regenerated. Existing generic software compatibility checks established account access to Astra/Luna, not application quality.

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

## Authorised quality fixes and follow-up acceptance

The owner authorised these targeted changes after reviewing the blockers. Original Production/flag-off prompts and the protected fixture are still unchanged; new helpers implement the experimental path instead of silently rewriting unrelated flows.

- `medicine-summary.ts` returns structured educational information, with an AI/non-official notice first, in the requested language and stable English parser headings. Unknown facts stay omitted; unknown products and truncated/invalid output fail. Numeric treatment schedules are not requested. The official-leaflet search control remains separate. English and Italian live checks now return useful summaries rather than retrieval refusals.
- `source-matches.ts` compares complete extracted ingredient sets and rejects additional/missing/duplicate actives, different strengths/bases, inferred salt conversions, different forms/routes, mismatched veterinary species and branded candidates in generic mode. It preserves branded origin lookup for generic searches. Decimal formatting (`500.0` vs `500`) and `per` vs `/` are normalized without concentration or unit conversion. Rejected candidates are never replaced by the original raw list.
- Each origin/candidate needs URLs actually present in the completed search tool's retrieved-source metadata, on the allowed domains for that country. This is provenance and extracted-data validation, **not deterministic validation of every claim in a regulator document and not clinical interchangeability approval**. The model can still misread a source; expert acceptance remains necessary.
- Result/source URLs are visible and clickable, survive explicit saved-result reopening/account draft restoration, and are bounded/deduplicated/protocol checked. Empty confirmed result lists display the existing localized no-result message rather than treating `No matches` as a medicine. No new untranslated UI labels were added; generated summary prose follows the selected language. The photo and branded wordmark remain unchanged.

Live positive checks after the fixes: the UK generic case returned two source-cited candidates in about 10.1s using Luna research; the UK-to-France case returned two source-cited candidates in about 17.6s using Sol research. Revised English/Italian summaries completed in about 5.6s/5.9s. These are individual sample observations, not latency SLAs or broad medical validation. Earlier Luna international attempts missed known-positive results; this motivated the separate Sol research role. The cited two-ingredient Ireland case returned no confirmed candidates rather than the unverified extra-ingredient suggestions; unit tests explicitly reject caffeine added to the two-ingredient fixture. No actual patient data was used. Follow-up evidence is in `tests/fixtures/model-upgrade-quality-fixes.json`.

Browser checks with mocked responses cover mobile source links, visible AI-summary notice, evidence persistence in saved results, empty-list rendering and no horizontal overflow/page errors. Database tests retain the one-search/all-returned-leaflets charging behavior. All 25 small JSON-translation fixtures passed previously; full new medical prose has only English/Italian live acceptance so far, and all languages still need native editorial/medical review.

**Coverage limitation:** the research allowlist is configured for United Kingdom, Ireland, France, Italy, Spain, Germany, United States, Canada, Australia and New Zealand. This does not establish live acceptance in all ten, and it does not cover the app's entire worldwide country picker. Unsupported countries return `SOURCE_COVERAGE_UNAVAILABLE` before provider calls; their failed reservation is released. Do not enable this globally until coverage and known-positive/negative cases are accepted for the intended release countries. Do not add a model-memory fallback to hide missing evidence.

Before rollout, finish country/provider coverage, representative single/combination human and veterinary source-content review, species/formulation cases, all-language summary review, timeout/rate-limit and real cost measurements (including web-search fees). The source flow is slower and uses more input tokens than old memory-only generation. Current Preview/public deployments and private-vault branch are unchanged; the upgrade flag remains off.

## Owner-reported UK–Italy strength regression

The owner reported that UK co-codamol 8/500 sometimes returned Italian Co Efferalgan 500/30 in the existing deployed path. Its legacy text filter explicitly restores the raw list when every candidate is rejected; it also lacks source-backed full-composition validation. A better prompt alone is not an acceptance control. No prompts were changed for this investigation.

The new named offline regression rejects 8 mg versus 30 mg codeine in both directions, including the final response list, and separately checks that matching 30/500 profiles are accepted only with the same form. All 58 offline tests pass. The live runner now supports MEDICEA_EVAL_CASES for bounded, repeatable checks.

Actual API replay through the experimental application handler, using Sol source research and unchanged prompts: UK Co-codamol 8/500 tablets to Italy established the 8 mg codeine/500 mg paracetamol origin and returned no confirmed candidates (200, approximately 16.4 seconds). This is a safe empty result, not proof no equivalent exists in Italy. The reverse Co Efferalgan 500 mg + 30 mg compresse to UK could not establish the Italian origin from the configured sources (422 NOT_FOUND_ORIGIN, approximately 9.5 seconds). Treat this as an unresolved known-positive source-coverage failure, not a passed test or proof the product does not exist. Do not activate while that acceptance gap remains. Neither result establishes clinical interchangeability.

Follow-up screenshots confirm the deployed app produces Italy-to-UK 500/30 results and show the reported UK-to-Italy 500/8 versus 500/30 mismatch. They are the existing working-behavior baseline, not verification of every generated brand. The old leaflet prompt reads drugDosage but does not interpolate it, explaining why the origin information can discuss multiple strengths. That protected prompt is unchanged. The experimental source helper now additionally rejects a simple explicit combination selection that conflicts with its researched origin, before searching the target. It compares unordered milligram amounts for simple selections such as `500 + 8` and `8mg/500mg`, never rewrites label strengths, and leaves concentration/ambiguous formats to existing source validation. This is a bounded consistency check, not a complete strength parser.

The result header now retains the entered home country, destination, medicine and dosage during loading and after completion, using existing translated field labels. It also works with restored searches and preserves the existing Edit search action. Desktop/mobile mocked-browser checks cover loading/completion visibility, edit preservation and overflow; all 59 offline tests pass. These additions remain in the draft upgrade branch; the deployed app and its legacy lookup are not changed by this work.
