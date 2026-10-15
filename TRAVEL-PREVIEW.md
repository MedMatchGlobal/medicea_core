# Travel demonstration — first review milestone

Branch: `feature/travel-pack-preview`, based on `feature/openai-model-upgrade-preview` at d9a8389.
Entry: `/travel`. Separate owner Preview; `/travel` is unavailable in Production and other Preview branches. An explicitly opted-in local development run can use `MEDICEA_TRAVEL_DEMO=true`. This does not activate the medicine-model experiment on a new branch or change its existing tester deployment.

## What to test

1. Create a UK/Italy demonstration trip with departure/return dates and one or both fictional medicines. There is deliberately no free-text medicine, patient, record-upload or payment field.
2. Save and reopen the trip in the same browser. Complete checklist items and confirm they persist after reloading. The local demo account provides access to the saved trips and clears only this demo's data.
3. Open the pharmacist card, switch its language, and print it. Labels support all 25 existing app languages, including RTL. The existing device-language preference is reused.
4. Download the standalone HTML pack, then open the downloaded file without network access. It contains the trip, fictional medicine comparison, checklist and pharmacist card in its selected language. The download has no external assets, scripts, analytics or network requests. It is a dated snapshot, not an app-wide offline mode.
5. Open Health updates. Switch between Home, Destination and Where I am; changing the feed's destination country must not rewrite a saved trip. Filter the three fictional update categories. Every item is labelled as demonstration content. The official-source links are separate and do not imply those authorities published the fictional articles.
6. Optionally request location access. Coordinates are processed on the device against a bundled Natural Earth country map; only the suggested country and opt-in preference are retained. No GPS coordinates are sent to a geocoding service, included in URLs, or saved in the demo state. A denied/unavailable location offers manual selection. Auto-update occurs on opening the page with prior consent and permission, not continuous background tracking. Manual selection switches it off.

Country boundaries are approximate (1:110m), omit some small countries/islands, and cannot establish legal borders. Suggestions are labelled approximate and can be corrected manually. The map is public-domain Natural Earth data; attribution and source are in `public/travel-demo/ATTRIBUTION.txt`.

## Validation

89 offline tests and the optimized build pass, including protected-prompt preservation, Preview isolation, strictly fictional selections, date checks, safe bilingual export, geometry/holes and all 25 translation bundles. Desktop/mobile browser checks cover creation, saved reopening, checklists, translated cards, offline export/reopening, feed filters, local country identification, coordinate non-disclosure, auto-location opt-out, reset, denied-location fallback, and Italian/Arabic/Hebrew layouts. The Preview is checked with Production runtime flags to ensure `/travel` is 404 and discovery navigation has no demo links.

## Deliberately not activated

- Real accounts, cloud synchronisation, personal medicine profiles, uploads, vault records, notifications and payment collection.
- Live news ingestion, automated article translation, a continuously refreshed or background notification service. The current feed is a fully translated fictional UI demonstration with official-source links.
- Medical recommendations, real equivalents or verified medicine carriage permissions. The checklist and sample comparisons are illustrations, not completed clinical/legal checks.
- A new public paywall or changes to existing medicine prompts, research routing, billing rules, the photographic hero or medicéa branding.

## Next implementation milestones after reviewing the demonstration

1. Test the complete journey with fictional data and settle navigation, pack contents, language handling and the paid value proposition.
2. Implement UK/Italy live-feed ingestion with a vetted source register (MHRA/UKHSA/AIFA/health ministry plus WHO/ECDC), source-reuse review, country/region tagging, published/updated/retrieved timestamps, deduplication, correction handling, cache expiry, source-outage states, and translated summaries with original links. An RSS link is not evidence that every item may be republished in full. No article ingestion or translation costs are incurred by this demo.
3. Before real health data or paid launch: complete the GDPR evidence audit, 25-language privacy notice, lawful-basis and health-data assessment, processor/transfer review, retention and inactivity policy, tested erasure/recovery controls, breach-response procedure, and qualified privacy/insurance review. Define account access, export/deletion and offline-download handling before connecting real profiles or the vault.
4. Implement secure shared accounts/trips and permissions, then test real payment/entitlement integration in test mode with end-to-end purchase, expiry, cancellation and retained-pack access. Obtain a separate public-release decision after those checks.

No additional API keys, source accounts, billing setup or patient data are required to try this demonstration. Owner feedback on the complete fictional journey is the next useful input; source licensing and qualified privacy/insurance review are later launch dependencies.
