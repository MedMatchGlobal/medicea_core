# Connected owner demo

The exact `feature/travel-pack-preview` Vercel Preview can run the shared Travel interface with public medicine examples through the existing source-origin, full-composition matching and medicine-information APIs. Production and other branches remain excluded. Original prompts and clinical acceptance gates are unchanged.

## Activation

Keep Vercel deployment protection enabled. Scope these server-only variables specifically to Preview / `feature/travel-pack-preview`:

- `MEDICEA_TRAVEL_CONNECTED=true`
- `MEDICEA_OPENAI_UPGRADE=true`
- `MEDICEA_TRAVEL_TEST_ACCESS_CODE`: an owner-created random access code of 24–200 characters, stored as Secret. Never paste it in chat or commit it. Rotating it invalidates existing test sessions.
- Existing `OPENAI_API_KEY` or numbered OpenAI keys. Confirm they belong to the project funded by the owner; a credit purchase alone does not establish this.

Redeploy Preview after configuration. `/travel` opens the connected gate when opted in; `/travel/connected` also shows setup status. `/travel/pilot` retains the separate fictional pilot. No merge to Production is part of this change.

Address suggestions additionally need `GEOAPIFY_API_KEY` and `MEDICEA_TRAVEL_ADDRESS_LOOKUP=true`; OpenAI credits do not fund this provider. Without them, manual address entry remains available. Nearby-care and embassy Maps links remain explicit-click searches. News currently connects only UK MHRA headlines; other countries expose official links. Expanded country news and automatic translation are not implemented by this migration.

## Test boundaries and costs

Use public medicine examples and fictional itinerary/contact details only. This is an owner API test session, not a personal account or private health vault. Up to 20 product profiles, eight reusable country packs and ten dated trips use a separate browser **sessionStorage** key; closing the tab can discard them. Nothing is synced to a cloud profile. Pilot localStorage is not migrated, overwritten or cleared. Signed origin-selection tokens stay in component memory. The access cookie is HttpOnly, SameSite Strict, eight hours and Secure on Vercel.

Lookup, Compare, Refresh and Generate medicine information explicitly call providers. Saving, reopening, removing, assembling a pack and downloading do not initiate new medicine research. Refresh after an expired selection token may re-identify the origin first and requires more than one model/tool call. No fixed price per comparison is promised; inspect actual token/tool usage in the funded OpenAI project. Backstops of 12 unlock attempts/10 minutes, 40 provider actions/session/hour and 80/instance/hour are test safeguards, not durable account FUP or billing caps. Provider budgets/quotas remain necessary. Credits, paid plans and automatic user suspension are not activated.

Choose an exact source-identified product before saving. Country selectors have differing source coverage; unsupported/unconfirmed origins return no product rather than fictional fixtures. Saved comparisons retain their dates and full product identity. A formulation/ingredient/strength change requires re-identification; failed refresh does not overwrite the prior result. Pack/trip snapshots retain actual strengths, origin and comparison evidence even if the library changes. They do not update automatically.

Origin response parsing canonicalises explicit human/humans/Homo sapiens species labels to the empty human-species array expected by the validator. Missing, unknown or mixed animal labels remain rejected, as do incomplete composition, wrong strengths and unretrieved sources. Owner-branch validation diagnostics contain aggregate counts only, never medicine queries, profiles, source URLs, user-entered strengths, model output or credentials.

Connected Travel research completions have a 55-second attempt within a 60-second request budget instead of the legacy ten-second attempt. An ambiguous disconnect/timeout is not retried with another key, to avoid duplicate research charges. Explicit provider HTTP failures retain existing failover policy. This transport change is restricted to the connected Travel Preview and its configured research model; Production, flag-off and the separate model tester retain their previous budgets. Prompts and model selection are unchanged.

## Acceptance checks

134 automated tests and optimized build pass, including protected-prompt preservation, exact Preview gating, signed session tamper/expiry/rotation, product/schema isolation, snapshots/HTML escaping and 25-language copy. Mocked browser flows at 320/390/1280 cover unlock, exact formulation selection, public product save, empty and saved comparisons, failed-refresh retention, successful refresh history, explicit information generation, packs, dated trips, offline HTML, reminders, reload with no paid calls, medicine return links and logout/pilot separation. These do not establish live vendor availability, funded-project identity or clinical accuracy. Complete live public-example checks after owner access-code configuration.

Personal login, MyHealth, real health records, identity/document uploads, family sharing, billing and Production release remain separate work. Before accepting real health records or public/paid vault release, complete the GDPR evidence audit, privacy notice in all 25 languages, lawful-basis and health-data assessment, processor/transfer review, retention/inactivity policy, tested erasure/recovery, breach-response procedure and qualified privacy/insurance review. Include itinerary addresses, manual contacts, passport preferences and exports in that assessment.
