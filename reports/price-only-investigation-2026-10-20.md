# Price-only investigation against the frozen working Dev

No application changes or live provider calls were made for this initial inspection. The frozen baseline is `933511c`.

## Observed difference

The owner's successful standalone Italian `Co Efferalgan` screenshot shows a product-family leaflet and a quoted price for a 16-tablet film-coated pack. The equivalence screen identifies an Italian SM Pharma parallel-import effervescent pack and UK co-codamol effervescent products. These are different product/pack identities; the screenshot alone does not establish a page-specific price bug or justify copying the family price to the selected product.

## Code findings

Both standalone and equivalence leaflets use `structuredLeaflet`, followed by the same independent `lookupLeafletPrice`. Pricing already runs separately from medical leaflet generation. A failed price lookup returns an empty array and does not discard the leaflet. Equivalent requests use the product country's value in the field named `originCountry`; the variable name alone does not prove a country-routing problem.

The price request receives `drugName`, `originCountry`, an optional dosage hint, language, audience and `selectedProfile`. It does **not** receive `equivalentResult`, even though that context is retained for medical leaflet research. An original selected profile can carry composition and source context, whereas an equivalent leaflet often relies on its title. This is a possible context difference, not a demonstrated cause of the missing prices.

Other distinct failure modes currently all become `Not specified`: no quotes found, rejected fields/country/amount/currency, source URL not found in recorded search results, response parsing/completion failure, or timeout. The separate price request has one web action and a maximum 20-second timeout. No settings or acceptance rules have been changed.

## Boundary for further work

Investigate the price request and its validation separately, using fixed public examples and the existing request contract. Retain all clinical generation and equivalence code exactly. A price-only correction may touch `app/lib/leaflet-price.ts`; any need to alter shared orchestration, a price prompt/model/cap or the locked deployment must first be presented to Sergio. Do not repeat the previous source-handling or generation experiments.
