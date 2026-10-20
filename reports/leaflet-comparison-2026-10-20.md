# Controlled leaflet comparison — 20 October 2026

The live comparison did **not** reproduce a consistently working 09:40 baseline. It also did not identify a single code change whose reversal restores reliable leaflet generation. The current implementation passed once; the original implementation failed twice. This is a small diagnostic sample, not a reliability estimate or proof that the current version is better.

## Method

Eight live public-example provider requests ran on the same Dev deployment (`d187feb`) and API configuration. The fixture was `Co Codamol`, United Kingdom, English, no strength, no selected profile. Requests used Sol with low reasoning and a 6,500-token output limit. Each arm ran twice, in paired concurrent requests, without caching, retries or price enrichment.

The original request was captured by executing the safeguarded 09:40 implementation from `ed508be`; the current request was captured from `645f4b3`. Tests verify those request bodies against their source implementations. Cap-isolation arms modify only `max_tool_calls`. These are generation/validation tests, not complete UI or price tests. Historic deployment environment settings and earlier model responses are not available, so this cannot recreate every condition at 09:40.

Both historical and current source validators assessed every completed output. Clinical structure and the five required sections were assessed independently. Actual generated medical text was not retained. The JSON evidence contains public document locations, with queries and anchors removed; the validators assessed original full URLs.

## Results

| Request | Web-action cap | Round 1 | Round 2 | Passed all leaflet gates |
|---|---:|---|---|---:|
| Original 09:40 | 1 | Missing contraindications; source checks passed | Six sources exceeded the five-source limit; sections complete | 0/2 |
| Current | 3 | Three unrecorded source URLs; sections complete | Sources and required sections passed | 1/2 |
| Original, cap changed only | 3 | Provider timeout at 40 seconds | Six sources exceeded the five-source limit; sections complete | 0/2 |
| Current, cap changed only | 1 | Missing contraindications; source checks passed | Missing contraindications; source checks passed | 0/2 |

Historical and current source validators agreed on acceptance for every completed response. The current source-handling changes did not uniquely reject a response that the old validator accepted in this sample.

## What the evidence supports

- The historic five-source acceptance limit could reject a six-source response even at 09:40. Its schema did not enforce that maximum. The current schema does enforce it, and both current-prompt arms stayed within five sources in these runs.
- One web action did not reliably produce the required contraindications. Reverting the current cap to one is not supported as a remedy by these tests.
- Three actions can produce complete sections, but source URL selection remains inconsistent. One current response listed three EMC product URLs absent from its recorded web results; another current response passed all gates.
- Keeping the clinical and provenance gates is warranted. Neither removing them nor dropping unmatched URLs would demonstrate that the remaining facts have adequate support.
- No deterministic cause for the reported change in reliability has been established. Generated responses and web results vary across identical inputs; comparison results must not be described as a proven model-service change or a proven regression caused by a specific commit.

## Outcome

No normal leaflet prompt, model, cap, matching rule or clinical acceptance check changed during this comparison. The 09:40 backup remains intact. The temporary comparison page and endpoint are disabled unless the explicit Dev-only `MEDICEA_LEAFLET_COMPARISON=true` flag is set. No further architectural change is implemented by this investigation.

The remaining reproducible problem is intermittent mismatch between generated supporting URLs and recorded retrieval URLs. A separate research/generation design could constrain source selection to server-supplied evidence, but it is a proposal requiring the owner's approval, not a proven fix established by this comparison.

Evidence: `leaflet-comparison-2026-10-20.json`. Reproduction tooling: `scripts/capture-leaflet-comparison.cjs --check` and `tests/leaflet-comparison.cjs`.
