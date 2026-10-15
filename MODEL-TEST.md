# Owner model/prompt test — exact-match-v2.2

Test URL: https://medicea-core-git-feature-openai-7499df-medmatchglobals-projects.vercel.app

Comparison: https://medicea.global

## v2.2: clear empty results and visible origin strengths

A completed equivalent search with an empty list now shows a soft teal “No exact match found” panel. The explanation says that the search could not identify a medicine with the same active ingredients, strengths and formulation; it does not claim that no such product exists. This copy covers all 25 UI languages. Unconfirmed origin/strength and service failures remain distinct incomplete-search states.

When matching returns a structured origin composition, its ingredient strengths are displayed separately from the generated summary, even if the user left the dosage hint blank. These are model-reported facts, not independently verified label data. If the origin cannot be identified, the existing clarification state remains necessary. No numeric strengths are fabricated or copied from the user hint into label facts. The summary and matching prompts are unchanged in this revision.

Refusal and no-result sentences are rejected as medicine names by the display, saved-result normalizer and prompt-test profile validator. Refusals remain failed searches rather than confirmed empty matches. Saved searches and account-return drafts retain the new empty-result state and origin composition.

Validation: all 71 offline tests and the optimized build pass. Mocked browser checks at 390 px and 1280 px cover blank dosage with returned origin strengths, normal empty results, saved-result reopening, multiline refusal rejection, valid medicine cards, and absence of overflow or page errors. These checks verify UI behavior, not medicine availability or clinical equivalence.

The owner authorised this isolated test deployment on 15 October 2026. It does not replace the public app. The teal test banner and `/api/model-test/status` identify the active revision, configured models and matching mode. Preview protection is retained; use the owner's existing Vercel access if asked to sign in. Original protected prompts and Production behavior remain unchanged.

Revision v2.1 fixes partial-result handling without changing prompts or provider timeouts. In the non-membership test flow, the summary and equivalent requests now start together instead of running sequentially. A failed equivalent request retains the AI summary and uses a specific, translated clarification message for NOT_FOUND_ORIGIN/ORIGIN_STRENGTH_MISMATCH (422), rather than replacing everything with a generic service error. Other service failures remain distinct from an empty successful match list. A failed summary no longer prevents the independent equivalent lookup. The existing compound membership request, quota handling, version/cancellation guards and no-fallback matching rules remain intact. Summary text remains unverified educational information even when retained.

The owner's `Solpadeine` / `500 + 12.8` / UK-to-Italy input was replayed through the actual API: the observed run returned 422 NOT_FOUND_ORIGIN after about 4.2 seconds, not a timeout. This reproduces one failure mode but does not prove the exact cause of the earlier hosted attempt. Product ambiguity is material: the [manufacturer](https://www.solpadeine.co.uk/product/solpadeine-max/) lists Max tablets with paracetamol 500 mg/codeine 12.8 mg, and Max soluble tablets with an additional 30 mg caffeine. Do not silently discard that extra active ingredient. The UI cannot treat an earlier generated summary as verification of the origin.

The leaflet display now recognises headings at line starts, preventing `Contraindications` from becoming `Contra` + `Indications`, or manufacturer/regulator mentions in the AI notice from becoming false headings. New failure copy covers all 25 UI languages. All 67 offline tests and the optimized build pass; mocked-browser scenarios cover concurrent request start, retained summary after 422/503, matching despite summary failure, heading integrity and mobile overflow. Removing serialized requests reduces avoidable latency; no response-time guarantee or timeout increase is claimed.

Only Vercel Preview for `feature/openai-model-upgrade-preview` defaults the upgrade on. `MEDICEA_OPENAI_UPGRADE=false` disables it. No other branch is automatically opted in. The exact owner branch defaults human equivalents/generics to `prompt-test`; set `MEDICEA_OPENAI_MATCHING_MODE=sources` to use the distinct source-grounded pilot. Source-mode research remains limited to its ten configured countries and retains its unresolved Italian-origin coverage limitation. Veterinary discovery still uses that source pilot.

## What this test changes

- Human origin and candidate requests use GPT-6.1 Sol via the actual Chat Completions API, with short separate prompts, JSON products, low reasoning and no tool lookup. Requested strengths identify real variants; they never overwrite returned label facts.
- Server checks compare the complete model-reported ingredient/strength set, formulation and route. Wrong-strength/extra-ingredient candidates are dropped, with no raw fallback. Explicit human species labels are normalized case-insensitively without accepting animal products.
- **The model may still invent or misdescribe a product. These candidates are not independently source-verified and are not clinically validated substitutes.** The banner says so. This is an owner prompt experiment, not a release candidate approved for patient decisions.
- Human medicine summaries use Luna and ask for only the selected variant. They identify themselves as AI educational information rather than official leaflets. Existing translation/general routes use the earlier gated migration adapter; explicitly pinned overrides remain unchanged.
- Result parameters remain visible. The internal test banner is English; existing product field translations remain available. It is separate from translated release UI.

## Manual comparison

Start a **new** search for each case; reopening a saved search reuses historical results. Record country pair, exact entered name, strength, language and screenshots. Compare both versions using the same inputs. Check both the candidate list and expanded information.

| Origin → destination | Medicine / selection | Check |
| --- | --- | --- |
| UK → Italy | CoCodamol / 500 + 8 | No 500 + 30 candidate. Empty or unconfirmed results are acceptable; never assume absence from the country. |
| UK → Italy | CoCodamol / 500 + 30 | Only matching full compositions/formulations; no invented lower-strength variants. |
| Italy → UK | CoEfferalgan / 500 + 30 | Preserve 500/30; treat failure to identify origin as a regression to report. |
| UK → France | Panadol Original 500 mg tablets | Confirm known-positive lookup and inspect exact strength/form. |

Live sample observations during development: focused prompt mode returned a UK 8/500 → Italy empty candidate list in ~9.6s and a UK Panadol → France candidate in ~11.5s. Earlier calls rejected origins, including a parsing mismatch for the model's `Human` species spelling, which was corrected with regression coverage. Italian Co Efferalgan origin identification remained inconsistent/failed in the final observed run. Do not interpret repeated trials or a passing sample as a reliability rate. The source-grounded revised prompt trials also missed known-positive cases; this motivated separating the prompt experiment from source research. No patient records were used.

Automated verification covers disabled/Production isolation, model/prompt transport, strict candidate filtering, ambiguous/conflicting origins, human versus animal handling, original-prompt preservation, and the existing membership/search tests. Browser QA uses mocked medicine responses; it tests the banner, runtime status and responsive search UI, not clinical correctness.
