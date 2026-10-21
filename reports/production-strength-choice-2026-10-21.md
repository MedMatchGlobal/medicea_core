# GPT-4o origin strength selection in the new interface

The owner authorised this correction on 21 October after finding that the restored Production matching behaviour could default Co-codamol to 500/8 and suggest Co Efferalgan 500/30. Scope: `feature/production-prompts-new-ui` Preview only; Production and all earlier immutable deployments remain unchanged.

The new UI already contained a translated product-choice screen. It had been enabled by the separate research experiment, not the restored Production routing. This update enables that existing screen for the GPT-4o international search. Other modes and the UI components remain unchanged.

## Behaviour

- Enumerate origin strengths and formulations before destination matching; never choose a popular strength when the query is ambiguous.
- A missing hint, shared partial hint or multiple matching forms returns HTTP 409 with product choices. No destination lookup or speculative origin leaflet runs before the choice. Save search stays disabled until the search completes.
- The existing signed, expiring server token binds the choice to the query, country and full composition. The selected composition is reused without another origin extraction. Unsupported strengths, tampered choices, cross-country/query reuse and unresolved profiles fail explicitly.
- Return structured destination profiles and compare the complete ingredient-to-amount mapping, units/basis, form, route and release. Reject extra/missing ingredients, mismatches and uncertain profiles. Never recover rejected raw text as result cards.
- Display each ingredient and amount alongside the product identity, including saved results. Keep model-generated results distinct from independently source-verified products.
- The membership compound handler establishes the origin before loading its existing leaflet; the existing 409 reservation handling does not charge a completed search for choosing a variant.

The international matching prompts are the specifically authorised exception to prompt preservation. GPT-4o, the leaflet prompts, price generation, other search prompts, sampling/timeout settings, interface components, saved searches and session persistence remain unchanged. The original protected prompt fixture was not edited.

## Validation

All 241 applicable tests pass, including ten new strength-choice regression tests, existing membership choice/quota checks, immutable Production comparisons for unaffected routes, and saved-search/session tests. The old Dev-lock test applies to the separate frozen experiment and is intentionally excluded for this owner-authorised integration. Next.js build and TypeScript check pass.

Fixed public live examples through the actual handler:

| Request | Result | Time |
| --- | --- | --- |
| UK Co-codamol, blank strength | HTTP 409; 8/500, 15/500 and 30/500 tablet choices; one GPT-4o call, no destination lookup | 3.294 s |
| Select the 8/500 tablet token | HTTP 200; preserved 8/500 origin; empty destination candidates, no Co Efferalgan | 0.997 s |
| Select the 30/500 tablet token | HTTP 200; preserved 30/500 origin; empty destination candidates | 0.736 s |

These live checks establish choice handling and request completion, not exhaustive catalogue coverage or clinical equivalence. GPT-4o may omit valid variants or candidates and can misreport product facts. Deterministic checks compare the supplied profiles; they are not an independent medicines register. No medicine/price reliability claim follows from these results. Empty results mean no candidate was returned and accepted, not that no equivalent exists.
