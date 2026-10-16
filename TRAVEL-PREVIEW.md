# Medicine library, travel packs and health news — owner Preview

Branch: feature/travel-pack-preview. Separate owner Preview only; entry /travel now opens My medicines. Existing /travel?tab=trips links open Travel packs. The exact-branch runtime gate keeps this journey and its news API unavailable in Production and other Preview branches. The existing medicine-model tester and medical prompts are unchanged.

## What to try

1. Open My medicines and confirm Home country. A supported region in the device's browser locale may suggest any of the eight supported demo countries; language alone never determines the country. Override the suggestion when necessary. This preference persists independently of interface language.
2. Add fictional medicine A and/or B once. Each has its own origin country, fixed fictional ingredient, strength and form. There is no free-text medicine/patient field or upload. These two fixtures are for interaction testing, not real research.
3. Open a medicine and choose a comparison country. Compare without entering travel dates, then save individual comparisons. Results retain the origin, destination and demonstration checking date. The source label explicitly says fictional demonstration, not a verified medicine source. No medicine API request or translation charge is incurred.
4. Reopen the list and its saved comparisons. Editing an origin invalidates that medicine's current library comparisons. Removing a library entry removes its current comparisons, without removing existing packs.
5. Create an optional Travel pack from selected saved medicines. Choose departure country, destination and dates, then save. Dates apply to the trip/reminder, not basic comparison. Reuse the same saved list in another pack without adding the medicines again. Departure country does not overwrite the user's Home country.
6. Reopen a pack, complete its checklist, select any of the 25 pharmacist-card languages, and print or download. Packs freeze per-medicine origins and saved comparison records. A new pack without a saved comparison says so; it does not invent a completed comparison. Existing legacy demo trips remain available and seed a deduplicated library once. An explicitly empty library is not repopulated from old packs.
7. Download the self-contained HTML pack and open it offline. It includes fictional medicines, per-medicine origin countries, the selected card language, checklist, and saved comparison dates. It contains no scripts, external assets, analytics or network access.
8. Optionally export a calendar reminder. Verify the editable departure time (default 09:00) in the device time zone, import the .ics file and permit calendar notifications. The absolute UTC event has an alarm 48 hours before departure; the calendar application controls delivery. No medicine detail, push notification, email or account automation is included.
9. Open Health news. There are two country views: Home country and Another country. Home is editable; Another country is retained separately. Use my location is a shortcut to the second view and never overwrites Home. Manual selection of the other country disables automatic location updates.

## News and location boundaries

The first live source is the fixed MHRA GOV.UK Atom feed for UK medicine/device safety notices. Up to 12 original-language headlines include source links, publication dates (or updated-date fallback) and Open Government Licence attribution. It is not comprehensive healthcare coverage or an emergency alert service. Italy, global sources, translated headlines, outbreaks and hospital coverage remain later work; unsupported coverage and source outages have distinct messages.

The feed is cached for ten minutes and an open page polls every ten minutes. Server fetches are bounded by eight seconds and 500 kB, reject redirects and XML entities/DOCTYPE, validate source URLs and dates, sort and deduplicate. Client URLs cannot choose another source. No medicine data or precise coordinates are forwarded to this endpoint.

Optional GPS lookup runs on the device against bundled public-domain Natural Earth country geometry. Coordinates are neither transmitted to geocoders nor saved. Only the country and explicit opt-in preference persist. Suggestions are approximate: some small countries/islands are omitted and boundaries/coasts are not authoritative. Denied permission permits manual selection. Automatic updating uses prior consent on page opening, not continuous background tracking. Map source details: public/travel-demo/ATTRIBUTION.txt.

Source and reuse references:
- https://www.gov.uk/drug-device-alerts.atom
- https://www.gov.uk/help/reuse-govuk-content
- https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/

## Layout and navigation

The shared header keeps the logo left, burger centred and language selector right. Core tools, My medicines, Travel packs, Health news and Account use one menu. The same compact coastal banner appears throughout (88 CSS pixels in the tested phone layouts, 104 on desktop; it can expand for long translations). All new controls support 25 languages, including RTL.

Travel-tab changes update native browser history in the mounted workspace without a server-page round trip, retain state, and reset scroll instantly. Browser Back/Forward and normal modifier-clicks remain usable; core destinations prefetch from Account.

## Storage, accounts and release gates

This is a browser-only fictional-data demonstration with no real login, cloud profile, MyHealth records, uploads or payment activation. Up to ten demo packs and two fixed demo medicines persist under the existing versioned local-storage key. Storage validation strips unrelated records, credentials and precise locations. When browser storage is blocked, an explicit warning appears and in-memory use/offline export remain available. Clearing demo data clears this key only, not language or public saved-search preferences.

For the finished product, My medicines and MyHealth are the private areas of one shared account. Saved travel packs belong to that same account rather than requiring another login. Purchase/entitlement management may also need account access. Health news and public lookup access need not require a personal health profile. Do not connect this demo to real health lists or cloud accounts yet.

Before real health records or paid/public release: complete the GDPR evidence audit, privacy notice in all 25 languages, lawful-basis and health-data assessment, processor and transfer review, retention and inactivity policy, tested erasure and recovery, breach response, and qualified privacy/insurance review. Define profile access, export/deletion and offline-download handling, then test secure accounts and payment entitlements in test mode before a separate public-release decision.

## Validation

105 offline automated tests and the optimized build pass, including protected-prompt preservation, Preview isolation, legacy migration, fictional-only storage, comparison keying/invalidation, device-region suggestions, immutable pack records, safe offline exports, feed safety and complete 25-language copy.

Phone/desktop browser checks cover adding the list once, comparisons without dates, saved reopening, reuse in two packs, retained original pack data after library edits/removal, offline export, two news views, home-country isolation from location, and no coordinate requests. An Italian-region suggestion can be overridden to the UK and survives reload and language changes. Library, news and pack views fit all 25 languages at 390 px. Existing packs/checklists migrate without loss; blocked storage still permits an offline download. Production retains its original public UI and returns 404 for travel and the news API.

No new credentials, login, payment setup or real health data are required to try this Preview.

The My medicines list now shows its count, while Country comparisons shows the selected destination, saved-result count and a separate missing-comparison message for each medicine. Travel packs has a direct return button to the main list. Saving a pack copies saved comparisons; it does not perform a new search. Unticking a medicine for a pack leaves the library entry intact.

Downloaded packs use individual medicine cards with label/value rows rather than a six-column table, retaining bilingual text, comparison dates and missing-result states. They fit 320/390/1280 px without horizontal overflow. The app's pharmacist-card print layout is unchanged. Existing downloaded files are snapshots: download again to obtain the revised layout.


## Medicine-centred saved comparisons and review

My medicines now starts with collapsed medicine entries. Each summary lists its saved destination countries; opening it reveals all saved country results, origin controls, per-country demo refresh and a country comparison action. Pack selection remains independent of expanding a medicine. No saved country result is hidden by the last destination selection.

An annual review flag appears on opening the app, using one calendar year after the demo check (29 February clamps to 28 February in a non-leap year). Every result shows its demo-check date and review-by date. Refresh uses the fixed fictional result, explicitly says no live source was checked, and retains up to 24 previous dated fixture results per medicine/origin/destination. Older/replayed checks cannot replace a newer record. History survives reload and accepts only prior date strings. Existing saved packs and downloads remain snapshots. Preparing a new pack reminds the user to review comparisons before every trip. These are in-app reminders, not background alerts or scheduled live research.

The review interface covers all 25 languages. Additional automated tests cover calendar-year/leap-day boundaries, retained history, country isolation, fixed pack snapshots, history sanitisation/bounds and translated copy. Browser checks at 320/390/1280 px cover collapsed entries, both country results, due flags, refresh/reload/history, comparison save inside a medicine, selection exclusions without library deletion, preserved old packs and no live medicine API calls. All 25 languages fit the expanded view at 390 px.


## Expanded country testing and pending results

Country selectors now support UK, Italy, France, Spain, Germany, Portugal, US and Australia. These are still fixed fictional medicine comparisons, not live country research. The same countries validate and persist for library origins, home preferences, comparisons and packs. New packs default the pharmacist-card language to Italian, French, Spanish, German or Portuguese for the matching destination, otherwise English; the independent language selector remains available. News coverage is unchanged: only UK MHRA headlines are connected.

Changing a comparison destination no longer clears unsaved results. Multiple pending medicine/country results remain visible with country-specific Save buttons. Running another country comparison, comparing another medicine or adding a library entry does not discard them. Saving one only removes that pending result and marks its saved result with a Saved badge. Unsaved results remain temporary until explicitly saved; saved results survive reload. Origin edits still invalidate the affected medicine's comparisons.

105 automated tests and the build pass. Browser regression checks at 320/390/1280 px compare all eight countries before saving, switch countries and medicines, save each result independently, reload, then build/reload a France pack containing the two correct country comparisons and a French pharmacist card.

Unsaved comparison cards have an individual × dismiss button with a translated accessible label in all 25 languages, visible keyboard focus and a 44px tap target. Dismissing a draft changes only temporary UI state; saved comparisons, other country/medicine drafts and travel packs are retained. Phone/desktop checks cover keyboard dismissal, collapse/reopen, Arabic RTL, unchanged stored data and subsequent save/reload.
