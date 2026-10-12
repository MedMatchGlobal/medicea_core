# Search and navigation feedback review

Implemented in the private preview:
- Editable condition search with optional suggestions, including cancer, prostate cancer and haemochromatosis. Unknown names can be typed; suggestions are not a closed catalog.
- Localized condition, care and pet guidance in all 25 supported languages.
- General doctor discovery is the default; specialties require an explicit selection. Hospital queries request human general hospitals.
- Pet medicine search has its own /pets page and no longer fetches or displays human medicine leaflets.
- Removed the duplicate international-search tile. English headings use Health tools and Search generic medication.
- Browser language is used on first visit; a saved language preference takes priority. Regional English locales use the shared English translation.
- Great Britain and UK constituent-country searches find the canonical United Kingdom option.
- Symptom triage includes England NHS 111 urgent-care guidance and 999 emergency guidance, with an NHS reference.

Remaining limits:
- Nearby-care links open Google Maps. Its results can include hospitals or unrelated services; this is not a verified or fully filtered provider directory.
- A veterinary provider directory and a missing-condition feedback submission service are not implemented.
- Separate regional English vocabularies and native automatic updates are not implemented by this change.
- Condition discovery remains educational and requires clinical review; adding a suggestion is not a treatment recommendation.

Validation:
- Production Next.js build passed; final TypeScript check passed.
- All 40 regression checks passed.
- Browser automation could not initialize because its Windows sandbox helper failed. Visual and interactive acceptance remain pending.

Preview acceptance:
1. Search the condition suggestions for prostate cancer and haemochromatosis; type a condition absent from suggestions and confirm the field accepts it.
2. Open doctor search: no allergy specialty should be selected automatically. Select a specialty explicitly and check the Maps query.
3. Open pet medicines from the header: confirm a separate page and no human leaflet button in results.
4. Search Great Britain in the country picker and check the United Kingdom option.
5. Review Health tools, generic-medication wording and the urgent-care text in symptom triage.

Navigation follow-up: one persistent four-choice header replaces the duplicate navigation. The same choices appear on human and pet pages and on narrow screens. Cross-page Health tools and Find care links open the intended section. The original condition query from pre-feedback commit 0f327f3 has been restored verbatim. All search API prompt templates remain unchanged from that revision. PROMPT-AUDIT.md contains exact templates and settings; tests/prompt-preservation.cjs protects the baseline. All 41 checks and the production build passed. Visual acceptance remains pending.

12 October 2026: pet page now includes one combined Find veterinary care card. A town/postcode/address opens a Google Maps discovery query for veterinarians and veterinary clinics together. No separate vet/clinic toggle or verified directory is claimed. Labels cover all 25 supported languages. Production build and five focused prompt/search checks passed. Existing prompts and model settings remain untouched. A veterinary-generic search is recommended for a separate prompt review and is not implemented by this change.

12 October follow-up: at the owner's explicit request, pet generics now has its own mode and /api/openai/pet-generics endpoint. PET-GENERICS-PROMPT.md records the authorized provisional prompt and limitations. Existing protected prompts are unchanged. Human and pet pages now share a persistent discovery layout instead of remounting the UI on route changes. Late search results are ignored after a section switch. Production build and all 44 regression tests passed; final type check and focused checks passed after the navigation response guard. Phone visual acceptance and live pet-generic search remain pending.
