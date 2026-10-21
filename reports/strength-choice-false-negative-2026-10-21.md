# Correct the 30/500 false negative

The owner reported that the new product-choice UI correctly separated strengths but returned no exact match for both 8/500 and 30/500. This follow-up fixes only the GPT-4o international matching workflow on `feature/production-prompts-new-ui`. Production, other branches, all UI components, saved-search/session code, model settings and leaflet prompts remain unchanged.

## Diagnosis

The failing 30/500 request returned `{"candidates":[]}` from GPT-4o itself, before application filtering. A clearer destination/composition-only retrieval request returned candidate brands. The earlier request carried the entire origin profile and asked the model to perform exact matching during discovery.

The comparator also used literal strings. `immediate` and `immediate-release`, and a per-tablet amount written with or without `per tablet`, could reject the same reported composition. Conventional oral immediate-release tablets and ordinary film-coated versions were rejected solely by the coating label.

A live probe then exposed a separate dangerous failure: the desired-strength discovery call invented a Tachidol 500/8 candidate. That interim version was held back. Its result was not accepted as evidence of a real product, and it was not deployed.

## Correction

1. Keep the existing product-choice step and signed choice binding.
2. Discover destination brands by full ingredient/amount mapping and destination only. Do not pass origin brand, generic status, origin country or internal token metadata.
3. Independently look up actual destination variants for the discovered names in a fresh GPT-4o request, without the requested strength, proposed composition, origin profile or previous assistant reply. Brand queries have proposed strengths/forms removed. Only those catalogue profiles can become matches. This also allows an omitted form of an identified brand to be recovered.
4. Require consistent full labelled ingredient names (including stated salt/hydration), singular amounts, explicit form and release. A product named effervescent must not be misclassified as a conventional tablet. Unresolved or contradictory catalogues are service failures rather than false absence claims.
5. Compare semantically equivalent formatting: immediate-release aliases; bare per-solid-dose amounts versus explicit per-tablet/capsule wording; and ordinary film coating for oral immediate-release tablets. Keep effervescent/soluble, enteric, modified-release, concentrations, different salts and different amounts distinct. Preserve the actual returned form in results.

No specific medicine or strength is hardcoded into application matching. Public names appear only in diagnostics and regression fixtures. The original protected prompt fixture is unchanged.

## Evidence and tests

The UK [Co-codamol 30/500 product information](https://www.medicines.org.uk/emc/product/4457/smpc) describes its labelled composition. AIFA's [February 2025 equivalent-medicines list](https://www.aifa.gov.it/documents/20142/2745037/Lista_farmaci_equivalenti_Principio_Attivo_17.02.2025.pdf) includes Coefferalgan 500/30 film-coated tablets. These are public diagnostic references, not a newly hardcoded runtime catalogue or a claim that every dosage form is interchangeable.

Latest fixed-public live handler check:

- Blank-strength UK Co-codamol: HTTP 409, three choices; 2.289 seconds.
- Choose 8/500: HTTP 200, no accepted candidate; 4.300 seconds, two GPT-4o calls after selection.
- Choose 30/500: HTTP 200, Tachidol 500/30 tablet candidate; 3.773 seconds, two GPT-4o calls after selection.

The live regression now requires a positive known 30/500 result and rejects invented Tachidol/Co-Efferalgan 8 mg variants. It no longer accepts empty results for both strengths as a passing test. Six additional mocked regression tests cover label-format normalisation, preserved form/release/ingredient/basis distinctions, invented strengths rejected against an unprimed catalogue, missing film-coated forms recovered, and malformed catalogues failing explicitly. All 247 applicable tests and the Next.js/TypeScript build pass. The guard for the separate frozen Dev experiment remains excluded for this owner-authorised Preview correction.

These remain model-generated catalogue statements. Two independent requests to the same model are not independent regulatory verification, and completeness, current availability, prices and clinical interchangeability are not established by these tests. A source-backed product catalogue is still required for stronger product-fact guarantees.
