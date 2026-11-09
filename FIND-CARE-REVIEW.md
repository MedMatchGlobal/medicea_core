# Find care services and emergency help — review draft

Prepared on 9 November 2026 on `feature/find-care-services`, based on billing branch commit 4850db0. No production deployment, Play release, pricing, entitlement or database change is part of this change.

## Behaviour

- Three independent Find care tiles: Blood tests & medical labs (clinical pathology / collection centres), Diagnostic imaging (private X-ray, CT, MRI, ultrasound), Physiotherapy (also called physical therapy).
- All seven care modes share the existing address / optional GPS and Google Maps flow. These are discovery searches, not vetted providers, booking services or promises of availability, price or referral-free access. Users should confirm services, costs and referral requirements directly.
- Physiotherapy was not a specialty in the existing canonical specialist list. Medical specialties such as orthopedics and sports medicine remain separate.
- New care labels and the emergency button label cover all 25 interface languages. Emergency dialog guidance currently supports English and Italian, with English fallback in other languages; this is a preview limitation to address before a wider localized rollout.
- A red emergency control is mounted once in the root layout, independent of account or subscription state, including membership, pets and terms pages.
- The dialog starts with no selected country. A manual selection needs no location permission or geocoding service. A call link appears only after selecting a country with a verified number. It opens the phone dialler, never automatically initiates a call or sends location to emergency dispatchers.
- Optional live GPS uses BigDataCloud's client reverse geocoder after the person chooses that option and sees the location/IP disclosure. Coordinates are not saved or sent through Medicea's server. No language, IP-only, home-country or stale-location fallback. Failed location lookup requires manual selection. Always confirm the suggested country, especially near borders.
- Initial verified coverage: EU 27 countries (112), UK (999), US and Canada (911), Australia (000). Unknown countries have no guessed dial link; the UI directs the person to their phone's emergency call/SOS feature. Do not wait for the app/GPS in an emergency.

## Official number references

- EU: https://europa.eu/youreurope/citizens/travel/security-and-emergencies/emergency/
- UK: https://www.gov.uk/guidance/999-and-112-the-uks-national-emergency-numbers
- US: https://www.911.gov/calling-911/
- Canada: https://www.novascotia.ca/911-emergency-when-call
- Australia: https://www.acma.gov.au/emergency-calls
- GPS service: https://www.bigdatacloud.com/docs/article/why-is-reverse-geocoding-api-free

## Rollout and branch boundaries

Build 20 is the owner's private billing preview. The regular tester release and medicea.global have not received these new changes. Historical AABs and already-installed apps cannot be edited in place.

This change supplies one shared implementation for future normal and private wrappers. Do not merge the entire billing branch into Production just to deliver these tiles. Prepare/review a focused port to the chosen public release branch, including the shared layout, care helper, translations and tests; test it against that branch's prompt-preservation baseline. Keep billing activation and membership flags separate.

Remote branch inventory was read without modifying any remote branch: main, test-android, beta/mobile-polish; feature/google-play-billing, feature/monetisation-preview, feature/private-vault-preview, feature/production-prompts-new-ui, feature/openai-model-upgrade-preview, feature/travel-pack-preview; experiment/claude-simple-leaflet, experiment/claude-sonnet-preview, experiment/legacy-sol-model-only; fix/mobile-country-picker, fix/result-heading-style; investigation/price-only-20261020.

Archived experiments and old releases are not rewritten. Apply the reviewed shared change when an active branch is next promoted; do not blindly synchronize prompts, database migrations or unrelated experiments across them.

## Validation

- `node --test tests/care-emergency.cjs tests/search-feedback.cjs tests/prompt-preservation.cjs`: 11 passing checks.
- `npx tsc --noEmit`: pass.
- `npm run build`: pass (Next.js 15.5.27).
- Browser: new care tiles; lab address-only form and disabled empty submission; manual Italy selection gives tel:112; unknown country removes the call link; phone-sized dialog fits and scrolls; root emergency control visible without sign-in. No actual emergency call or real GPS transmission performed.
- Remaining before release: verify real GPS consent/failure and dialler behaviour on an Android phone, review additional language guidance and country coverage, and review the focused public-branch port. Publish/deploy only with the owner's explicit approval for that audience.
