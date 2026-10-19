# Production prompt routing on Sol — 19 October 2026

Ordinary features in the Travel Dev deployment now select the original
Production handlers, independently of model migration. This covers human and
veterinary international/generic searches, English and translated leaflets,
general medicine information, condition information, triage and standalone
text/JSON translation. The Travel information action also calls the original
leaflet handler. Search-result layout and retained user inputs are unchanged.

`experimentalPromptsEnabled` is separate from `modelUpgradeEnabled`: the former
is false for normal Travel Dev traffic, while Sol transport remains enabled.
The separate model tester and explicitly selected experimental evaluation arm
retain their experiment. Discovery no longer requests source-origin variants
for the original-handler Dev flow. Production itself is unchanged.

Active-route parity tests capture outbound messages from the actual Dev
handlers and compare them byte-for-byte against immutable Production source
`f4ab1bd` (verified as current remote main on 19 October). They cover twelve
route cases, including the leaflet translation pass, plus the Travel leaflet
adapter. Protected prompt fixtures remain unchanged. Matching prompt messages
does not guarantee identical outputs across models or establish clinical quality.

# GPT-6.1 Sol with original prompts — model configuration

The owner clarified on 18 October 2026 that the original **prompt wording**
must be retained while using GPT-6.1 Sol everywhere in the test app. This
supersedes the GPT-4o model portion of the rollback described below.

The Travel Preview transport migrates GPT-4, GPT-4o and GPT-4o-mini (including
dated GPT-4/GPT-4o snapshots) to `gpt-6.1-sol`. Lookup, comparisons, summaries,
translations and other shared-transport calls keep their existing messages and
output contracts. Sol uses low reasoning; incompatible sampling/seed parameters
are removed and legacy max_tokens is mapped to max_completion_tokens. Legacy
model literals remain in protected original route sources and historical
fixtures; they are not the model sent by this Preview. No fallback sends a call
to GPT-4o. Production and other deployments retain their prior behavior.

Original-prompt evaluation routing no longer disables Sol transport migration.
Both evaluation arms now use Sol and the console explicitly describes this;
its storage key is separate from older model-baseline runs. Longer bounded
Travel research attempts apply to original-prompt Sol calls too; ambiguous
failures do not retry another key.

Validation: all 143 automated tests pass, including protected prompt fixture
preservation and outbound model/parameter checks across the workload families.

# Connected owner demo

The exact `feature/travel-pack-preview` Vercel Preview can run the shared Travel interface with public medicine examples through the existing source-origin, full-composition matching and medicine-information APIs. Production and other branches remain excluded. Original prompts and clinical acceptance gates are unchanged.

## Activation

Keep Vercel deployment protection enabled. Scope these server-only variables specifically to Preview / `feature/travel-pack-preview`:

- `MEDICEA_TRAVEL_CONNECTED=true`
- `MEDICEA_OPENAI_UPGRADE=true`
- `MEDICEA_TRAVEL_TEST_ACCESS_CODE`: an owner-created random access code of 24–200 characters, stored as Secret. Never paste it in chat or commit it. Rotating it invalidates existing test sessions.
- Existing `OPENAI_API_KEY` or numbered OpenAI keys. Confirm they belong to the project funded by the owner; a credit purchase alone does not establish this.

Redeploy Preview after configuration. `/travel` opens the connected gate when opted in; `/travel/connected` also shows setup status. `/travel/pilot` retains the separate fictional pilot. No merge to Production is part of this change.

Test access is rechecked when the window regains focus, becomes visible and once per visible minute. An expired session returns to the unlock screen without clearing this tab's saved public-example data. These status checks make no medicine/provider requests. `/travel/evaluation` provides the authenticated fixed-public-case comparison described in [SEARCH-EVALUATION.md](SEARCH-EVALUATION.md).

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
# Original search rollback — 18 October 2026

At the owner's explicit request, the signed Travel demo now uses the original
Production composition-extraction prompt with GPT-4o, temperature 0, and the
actual original equivalent-search handler (including its original candidate
prompt, seed and filtering). Production and the separate model tester are
unchanged. The experimental paths remain available only in the controlled
evaluation console; no live evaluation was run as part of this rollback.

The original lookup supplies composition, not source citations, route or
formulation. Its adapter marks those fields as not provided, retains a distinct
`lookup: original` provenance, and stores comparisons as
`original_prompt_unverified`. It must not be described as source confirmation or
formulation-validated equivalence. No source/formulation validation in the
experimental helpers was weakened. Existing saved records remain intact.

Regression checks: 142 tests pass, including original prompt preservation,
request-local model isolation, unchanged original comparison invocation,
explicit provenance and Production/other-branch rejection. Live product results
must be reported separately from these mocked provider checks.
