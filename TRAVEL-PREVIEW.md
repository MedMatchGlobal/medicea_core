# Travel packs, trip preparation and local contacts — owner Preview

Branch: feature/travel-pack-preview. Entry /travel opens My medicines; /travel?tab=trips opens Travel packs. Exact branch and Preview gates keep the journey and news API unavailable in Production and other Preview branches. The separate medicine-model tester, original medical prompts, model configuration, matching, billing and request routing are unchanged.

## What to try

1. Confirm Home country. A supported explicit device-locale region can suggest it; language alone never determines it. The override persists independently of the interface language.
2. Add fictional medicine A and/or B once. Each has its own origin country and fixed fictional ingredient, strength and form. There is no free-text medicine, patient or health-record input. Eight demo countries are supported: GB, IT, FR, ES, DE, PT, US and AU.
3. Open a medicine to see every saved country comparison. Saved results begin collapsed behind Show equivalents, with visible country, check/review dates and Delete saved comparison. Refresh retains up to 24 prior dated fixture results; it explicitly says no live source was checked. Annual review flags appear in-app, using calendar-year boundaries including leap days. These are not background notifications or research jobs.
4. Compare another country without dates. Unsaved cards stay visible when selecting or comparing another country/medicine. Each has its own Save button and × dismissal. Saved results survive reload. Deleting one affects only that medicine/origin/destination in the library. Origin edits invalidate current comparisons; existing destination and journey snapshots stay intact.
5. Create a Travel pack from selected medicines, using Select all if wanted. No dates are required. There is one reusable pack per country; saving that country again updates its current pack. Edit travel pack changes its medicine selection and copies the current saved comparisons. Saving never performs new research.
6. Print or download the destination pack without creating a trip. The independent pharmacist-card language defaults to the destination language for IT/FR/ES/DE/PT, otherwise English, and can be overridden across 25 languages. Equivalents in the on-screen pack start collapsed.
7. Choose Add address & travel dates to create a dated journey from that destination pack. Select the medicines needed for that journey and optionally enter a fictional stay address or landmark. Each journey has its own frozen medicine/comparison selection and checklist. Repeating a visit reuses the pack without re-entering medicines or overwriting an earlier journey. Opening Edit address & travel dates on a saved journey edits that preparation while retaining its checklist and consular contact.
8. Use the nearby pharmacy, GP and hospital links. They are generated locally and open Google Maps only on a deliberate click, using the stay address and destination, without medicine names. They are directory searches, not confirmed providers, opening hours or emergency contacts. No background Maps/Places API or OpenAI request is made.
9. Each pack/journey medicine can open its My medicines entry with the relevant country selected. A return button opens the same pack/journey. These links perform no AI research. If a medicine was removed from the library, the old snapshot stays readable and does not silently restore it.
10. A dated journey enables its departure checklist and optional calendar reminder. Verify the editable local departure time (default 09:00), import the .ics file and permit calendar notifications. The absolute UTC event has a 48-hour alarm. The calendar app controls delivery. No medicine details, address or consular contact are included in the calendar event.
11. Emergency services shows a destination-specific general emergency number and official source/reference date. The checked reference values are UK 999; IT/FR/ES/DE/PT 112; US 911; AU 000. Dial links are user initiated; no calls are placed by the app or tests.
12. Choose Passport country separately for the embassy/consulate finder; it is not inferred from phone language or Home. It persists on a prepared journey. Official foreign-ministry directories help confirm jurisdiction and services. Maps always offers a country-level search after passport selection, even on dateless packs or journeys without an address; a saved stay address narrows it to that area. No automatic claim of the closest suitable office is made. Same passport/destination country suppresses foreign-mission searches.
13. Save a fictional consular office name, phone and address in a prepared journey to test offline recall. These are explicitly user-entered, not independently verified. They can be edited or removed. They survive reload and appear in the offline journey download. Passport country and manual contact are not copied into the reusable destination pack.
14. Downloaded HTML is a dated snapshot with no scripts, remote assets or automatic requests. Dateless packs omit journey dates/checklists; dated downloads include the checklist, stay address, emergency reference number and saved consular contact if present. Old downloads cannot update themselves. The pharmacist-card print layout remains medicine focused.
15. Destination news opens the matching country without overwriting Home. Health news retains exactly two views: Home country and Another country. Optional geolocation determines the latter on-device using public-domain Natural Earth polygons; precise coordinates are not transmitted or persisted. Manual country selection stops automatic location updates.

Existing journey records and checklist ticks remain available. They seed one reusable pack per destination once if no packs field exists. Explicitly deleted destination packs are not recreated from old journeys. Library migration similarly does not restore explicitly removed medicines. Pack edits, library edits and current comparison deletion do not rewrite old journey snapshots.

## News and external lookups

The live news pilot remains UK MHRA medicine/device safety headlines only, in original English, with source links, dates, OGL attribution and ten-minute caching/polling. Other countries explicitly show unsupported coverage. Sources have fixed hosts, time/body limits and sanitisation. No medicine/profile/address/consular data goes to the news endpoint.

Maps links use the documented universal URL format, no Maps API key and no background provider retrieval:
https://developers.google.com/maps/documentation/urls/get-started

Emergency reference sources checked 16 October 2026:
- UK: https://www.gov.uk/guidance/999-and-112-the-uks-national-emergency-numbers
- EU: https://europa.eu/youreurope/citizens/travel/security-and-emergencies/emergency/index_en.htm
- US: https://www.911.gov/calling-911/
- Australia: https://www.infrastructure.gov.au/media-communications/phone/triple-zero

Official consular directory links are selected by passport country, never generated by an AI model. They cover GOV.UK, Italy's Esteri, France Diplomatie, Spain's Exteriores, Germany's Federal Foreign Office, Portugal's Portal das Comunidades, the US State Department and Australia's DFAT. Contact details and consular jurisdiction must be checked on the official directory; this Preview does not automatically retrieve or validate the closest mission's phone/address.

## Storage, accounts, cost and release boundaries

This remains browser-only fictional-data testing. Use fictional stay addresses and office contacts. There is no real login, cloud profile, MyHealth records, uploads, payment activation, credit mechanism or automatic FUP blocking. Two fixed medicines, up to eight destination packs and ten prepared journeys persist under the existing local-storage key. Fields are whitelisted; stay/contact text is bounded, contact phone formats are constrained, and downloads escape all user-entered text. Clearing demo data clears this key only. Blocked storage produces an explicit warning while in-memory use and downloads remain available.

There are no medicine AI calls when comparing fixtures, refreshing, saving, opening, deleting, creating packs, preparing journeys or following internal links. Nearby-care/embassy directory searches run only after an external link is selected. The live product needs measured server-side token/tool usage and a documented FUP before selecting thresholds, temporary restrictions or a heavy-user plan. No account enforcement is being simulated in this local-only preview.

For the finished product, My medicines and MyHealth are private areas of one account; destination packs and prepared journeys belong to it. Public lookup/news need not require a personal health profile. Before real health records or paid/public release: complete the GDPR evidence audit, privacy notice in all 25 languages, lawful-basis and health-data assessment, processor and transfer review, retention and inactivity policy, tested erasure and recovery, breach response, and qualified privacy/insurance review. Include travel addresses, passport preferences, manual contacts and offline exports in that assessment, then test accounts and entitlements in test mode before a separate release decision.

## Validation

115 automated tests and the optimized build pass, including protected-prompt preservation. Tests cover date-free packs, selected comparison reuse, independent dated snapshots, migration without resurrection, address/contact bounds, encoded fixed-host search URLs, passport/destination separation, emergency reference values, offline escaping, calendar alarms, news safety, all 25 languages and Preview isolation.

Browser checks at 320/390/1280 px cover date-free pack creation/select-all/download, two journeys from one pack, separate checklist/address data, calendar import files, medicine deep-link/return, pack edits preserving journeys, destination news, source links without background lookups, emergency dial URLs without calling, passport persistence, same-country handling, manual contact save/reload/delete/export and unchanged pharmacist printing. Prepared views and contact forms fit all 25 languages at 390 px. Production keeps public navigation and returns 404 for travel and its news API.

No new credentials, payment setup or real health information are required to test this Preview.


The embassy Maps action no longer disappears when a stay address is absent: country-level fallback and address-specific queries are regression tested. The official directory stays alongside it. Same passport/destination country handling is unchanged.


User-facing pack labels are Travel packs, Create travel pack, Save travel pack and Edit travel pack in all 25 languages. The reusable-by-country behavior and optional trip-preparation step are unchanged.

## Proposed sharing and document roadmap (not implemented)

Prepared trips now support up to ten stays within the same destination country. Add another stay provides its own address and dates within the overall trip dates. Stays are sorted chronologically and cannot overlap (a same-day changeover is allowed). Choose stay scopes nearby-care and embassy Maps searches; downloads include every stay. Existing single-address journeys remain editable. Save trip replaces Save trip preparation in all 25 languages. Reusable destination packs remain separate from individual itineraries. Multi-country itineraries are not introduced.

Family sharing should initially expose selected planned itinerary details through private, expiring, revocable access. It must not imply live whereabouts; live location would require a separate opt-in feature. Medicine details, health records and identity documents should be excluded from itinerary sharing by default.

Hotel confirmations and tickets belong in an optional private trip-document vault. An optional passport copy belongs in a separately controlled identity-document area, not a required profile field or ordinary shared trip attachment. No uploads, live sharing, identity storage, subscription billing or real accounts are enabled by this UI change. Complete the privacy and security release work above before accepting real documents. Validate demand and operating costs before choosing monthly or annual pricing.

## Home country and address autocomplete

Home country can be corrected in Account (and in the Home country healthcare-news view). Confirming a new home updates the preference only; stored medicine origins, saved comparisons, reusable packs and earlier trips are not rewritten.

Each stay address has an accessible suggestion list, keyboard selection and manual-entry fallback. Searches wait 500 ms after typing, require four characters, cancel superseded requests and are restricted to the pack destination. No lookup is triggered by merely opening a saved address. Geoapify receives only the entered address text, destination country and interface language. Selected address text is stored in the existing local fictional-preview journey; coordinates and provider metadata are discarded. Visible attribution links cover Geoapify and OpenStreetMap. Source: https://apidocs.geoapify.com/docs/geocoding/address-autocomplete/ and https://www.geoapify.com/address-autocomplete/ (storage/caching support).

To enable live suggestions, add a server-only GEOAPIFY_API_KEY and MEDICEA_TRAVEL_ADDRESS_LOOKUP=true to Vercel Preview, scoped specifically to feature/travel-pack-preview, then redeploy that Preview. Do not paste keys into chat, source files or NEXT_PUBLIC variables. Configure provider-side quotas and access controls; local backstops (60 calls/minute and 500/hour per server instance) are not a distributed billing cap. Keep the owner Preview access-protected. Without both settings the UI states that suggestions are disconnected and accepts manual addresses. The new endpoint is unavailable in Production and other branches. No OpenAI request is used for address suggestions. Provider errors are not reflected or logged with keys/addresses.

Address lookup tests use mock provider responses; no live vendor connection has been validated without an API key. Before moving medicine features to real API testing, retain the protected search prompts and clinical result checks, introduce appropriate test-account/storage handling instead of allowing real medicine records into this local fictional-data preview, and validate the combined workflow in the protected testing environment. This update does not merge into the separate model tester, activate real medicine records, sharing, uploads or billing.

## Compact layout

After confirmation, Home country in Account is a compact expandable row displaying the selected country. Confirmation closes it; first-use setup opens automatically. Healthcare-news country/location settings use the same disclosure pattern, with refresh always visible alongside. Selecting a country closes settings, while location failures remain visible outside a closed panel. Source/licence details and the official-source directory remain available in expandable rows. Expanding settings alone never requests geolocation.

Saved stays open as compact address/date summaries when editing a trip. A new stay opens automatically and closes the previous editor. Native form validation opens the first invalid stay before focusing its input; saved dates/addresses and required-field validation are preserved. Shared panel/form spacing is tighter while 44px tap targets, input font sizes, warnings, the coastal image and printing are retained.
