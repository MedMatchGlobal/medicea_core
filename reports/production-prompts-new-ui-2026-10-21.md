# Production prompts with the completed frontend — 21 October 2026

## Owner's approved scope

Retain the original prompts currently in Production, with their working model behaviour, and use them with the newer interface: burger navigation, improved results, session retention, saved/reopened searches and the completed frontend work. Model migrations remain separate.

Vercel's Production overview confirms `medicea.global` serves `f4ab1bd9ed8ec3eaaab129a8a21c85e6dbe23f37` from `main` (deployment `6HzNjYebJMYP2iJiQKQj815DQLZQ`). The isolated branch `feature/production-prompts-new-ui` starts from frontend checkpoint `48eff0c4967544f1dd9a5e3c17a163e6f403cd2c`.

## Integration

- Enable the existing frontend branch gate for this exact new Preview branch.
- Explicitly disable AI upgrades on this branch, even if model-experiment environment flags are present.
- Preserve original Production request bodies, models, temperature, seed, response formats, translation steps and matching behaviour. GPT-4o matching/leaflets remain GPT-4o; existing GPT-4 and GPT-4o-mini workloads remain pinned as in Production.
- Retain burger menu, coastal banner, result cards/details, Save/Edit/New Search, saved searches, loaded-leaflet retention, browser-history handling and all 25 language resources from the completed frontend checkpoint.
- No new researched leaflet, separate price lookup, Sol override or source validation is activated.
- Production, the working legacy URL, the locked researched Dev, the price-only investigation and the Sol comparison remain unchanged.

MedicineWorkspace, TravelHeader, TravelNav, SavedSearches, saved-search persistence and session-search persistence are byte-identical to the frontend checkpoint. Travel library/trip pages retain their existing demonstration status; the signed connected AI tester, private vault, real health records and billing are not promoted by this frontend integration.

## Validation

Twelve fixed offline route comparisons read the actual immutable Production API source and compare full provider request bodies and results against this new Preview, including international matching, human/veterinary generics, veterinary matching, English/translated leaflets, general medicine information, veterinary information, condition information, triage and both translations. All are identical. The original protected prompt fixture is retained.

All 231 applicable tests pass, including original-prompt preservation, branch isolation, saved searches and session navigation. The earlier Dev-freeze verifier applies to a different owner-locked experiment and is replaced here by explicit Production-request/frontend-checkpoint comparisons, not by regenerated prompt baselines.

Live public-example checks using the existing configured credentials:

| Request | Status | Elapsed |
| --- | --- | --- |
| UK Co-codamol to Italy | 200 | 3.606 s |
| Italian Co Efferalgan to UK | 200 | 3.117 s |
| UK Co-codamol leaflet, no strength | 200 | 3.873 s |
| UK Co-codamol leaflet, 30/500 | 200 | 3.945 s |
| Italian Co Efferalgan leaflet | 200 | 3.524 s |

These confirm service completion and original model routing, not clinical verification. Existing Production limitations are deliberately preserved: estimated prices may be generated, exact-strength matching is not established merely by a returned suggestion, and the legacy leaflet prompt does not consume a strength hint. The 30/500 fixture still returned family-level pricing with no specific prescription-strength price. These issues belong in the next product review rather than being silently changed with the interface.

No secrets or real health records are included in this report. Reproduction script: `scripts/test-production-ui-live.cjs` with API credentials supplied only through the execution environment.
