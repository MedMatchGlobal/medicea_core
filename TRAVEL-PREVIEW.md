# Travel demonstration — first review milestone

Branch: `feature/travel-pack-preview`, based on `feature/openai-model-upgrade-preview` at d9a8389.
Entry: `/travel`. Separate owner Preview; `/travel` is unavailable in Production and other Preview branches. An explicitly opted-in local development run can use `MEDICEA_TRAVEL_DEMO=true`. This does not activate the medicine-model experiment on a new branch or change its existing tester deployment.

## What to test

1. Create a UK/Italy demonstration trip with departure/return dates and one or both fictional medicines. There is deliberately no free-text medicine, patient, record-upload or payment field.
2. Save and reopen the trip in the same browser. Complete checklist items and confirm they persist after reloading. The local demo account provides access to the saved trips and clears only this demo's data.
3. Open the pharmacist card, switch its language, and print it. Labels support all 25 existing app languages, including RTL. The existing device-language preference is reused.
4. Download the standalone HTML pack, then open the downloaded file without network access. It contains the trip, fictional medicine comparison, checklist and pharmacist card in its selected language. The download has no external assets, scripts, analytics or network requests. It is a dated snapshot, not an app-wide offline mode.
5. Open Health updates. Switch between Home, Destination and Where I am; changing the feed's destination country must not rewrite a saved trip. The UK has a live MHRA medicine/device headline feed, labelled as an original-language pilot, with source links and publication dates. Other countries explicitly show that live coverage is not connected. Real news is separate from fictional trip medicines.
6. Optionally request location access. Coordinates are processed on the device against a bundled Natural Earth country map; only the suggested country and opt-in preference are retained. No GPS coordinates are sent to a geocoding service, included in URLs, or saved in the demo state. A denied/unavailable location offers manual selection. Auto-update occurs on opening the page with prior consent and permission, not continuous background tracking. Manual selection switches it off.

Country boundaries are approximate (1:110m), omit some small countries/islands, and cannot establish legal borders. Suggestions are labelled approximate and can be corrected manually. The map is public-domain Natural Earth data; attribution and source are in `public/travel-demo/ATTRIBUTION.txt`.

## Validation

94 offline tests and the optimized build pass, including protected-prompt preservation, Preview isolation, strictly fictional selections, date checks, safe bilingual export, geometry/holes and all 25 translation bundles. Desktop/mobile browser checks cover creation, saved reopening, checklists, translated cards, offline export/reopening, feed filters, local country identification, coordinate non-disclosure, auto-location opt-out, reset, denied-location fallback, and Italian/Arabic/Hebrew layouts. The Preview is checked with Production runtime flags to ensure `/travel` is 404 and discovery navigation has no demo links.

## Deliberately not activated

- Real accounts, cloud synchronisation, personal medicine profiles, uploads, vault records, app-delivered notifications and payment collection.
- Automated article translation, Italy/global live ingestion, outbreak/hospital coverage, and background notification delivery. The UK MHRA pilot uses original-language headlines only; unsupported countries have official-source links and an explicit coverage message.
- Medical recommendations, real equivalents or verified medicine carriage permissions. The checklist and sample comparisons are illustrations, not completed clinical/legal checks.
- A new public paywall or changes to existing medicine prompts, research routing, billing rules, the photographic hero or medicéa branding.

## Next implementation milestones after reviewing the demonstration

1. Test the complete journey with fictional data and settle navigation, pack contents, language handling and the paid value proposition.
2. Implement UK/Italy live-feed ingestion with a vetted source register (MHRA/UKHSA/AIFA/health ministry plus WHO/ECDC), source-reuse review, country/region tagging, published/updated/retrieved timestamps, deduplication, correction handling, cache expiry, source-outage states, and translated summaries with original links. An RSS link is not evidence that every item may be republished in full. The first UK source is now connected; translated summaries and other sources remain subsequent work. No news translation API calls or costs are incurred.
3. Before real health data or paid launch: complete the GDPR evidence audit, 25-language privacy notice, lawful-basis and health-data assessment, processor/transfer review, retention and inactivity policy, tested erasure/recovery controls, breach-response procedure, and qualified privacy/insurance review. Define account access, export/deletion and offline-download handling before connecting real profiles or the vault.
4. Implement secure shared accounts/trips and permissions, then test real payment/entitlement integration in test mode with end-to-end purchase, expiry, cancellation and retained-pack access. Obtain a separate public-release decision after those checks.

No additional API keys, source accounts, billing setup or patient data are required to try this demonstration. Owner feedback on the complete fictional journey is the next useful input; source licensing and qualified privacy/insurance review are later launch dependencies.

## Navigation, calendar and first official feed update

- The four navigation links are now in a compact burger disclosure beside the travel logo and language control. Mouse hover, keyboard activation/Escape, outside-click dismissal and touch activation are supported.
- The departure checklist still records preparation checks in the browser. An optional calendar export creates a departure event with a display alarm exactly 48 hours before its UTC start. Departure time is editable (default 09:00), explicitly interpreted in the device time zone. Check this if the device time zone differs from the departure country. The user must import the .ics file and enable calendar notifications; calendar applications control delivery and may handle alarms differently. No app push/email/background reminder or medicine detail is included. Existing saved trips require no migration.
- Pharmacist cards still come from the selected fictional fixtures, not real pre-departure search records. Connecting real formulations, provenance and confirmation needs the real-data/account release gates.
- `/api/travel-news` is gated to this branch and Preview, like `/travel`. UK medicine/device notices come only from the fixed MHRA GOV.UK Atom endpoint, cached for 10 minutes. The open page polls every 10 minutes. Only original headlines, publication/update fallback dates and source links are shown, with OGL attribution; no article body is republished. Titles are not translated yet.
- Feed fetches have an 8-second timeout, a 500 kB body bound and no redirects. Parsing rejects entities/DOCTYPE, validates source URLs and dates, deduplicates and sorts up to 12 notices. Provider failure displays a separate unavailable state; unsupported countries are not described as having no alerts. News is never inferred from a personal medicine profile. No precise location or medicine data is forwarded.
- Source/reuse references: https://www.gov.uk/drug-device-alerts.atom , https://www.gov.uk/help/reuse-govuk-content , https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/ . Do not imply endorsement or comprehensive/local emergency coverage.
- Validated: 94 offline tests in total, optimized build, browser trip compatibility, calendar download, 25-language forms, touch/hover/keyboard navigation, source-failure/coverage states, and Production 404 checks for both travel and feed routes. A live local request retrieved 12 official notices; Italy returned unsupported, as intended.

## Shared header and compact hero refinement

The travel Preview now uses one shared `TravelHeader` on medicine, pet, trip, health-update and demo-account screens. The logo stays left, the burger is centred, and the language selector stays right on one row. The visible Language heading is removed while the selector keeps its accessible name. All core tools and travel sections live in the burger, with no duplicate button row. The menu is inside the sticky header stacking layer so landing-page navigation cannot obscure it; long menus scroll within the viewport. Existing in-page search/tool/care actions are reused.

The coastal photograph is retained as a shorter hero on medicine/core discovery and My trips. Health updates and Account consistently omit it. These refinements are gated to the travel Preview and do not change medicine prompts or Production navigation.

Validation: all 94 automated tests and optimized build pass. Browser checks cover all seven menu links being unobscured and pointer-reachable across seven routes at 320/390/1280 px, matching header geometry, Escape dismissal, core tools/care/search/pet navigation, 25-language phone forms and RTL menu bounds. Production still excludes the demo header/navigation and returns 404 for travel.
