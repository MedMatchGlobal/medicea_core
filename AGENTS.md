# Owner-locked working Dev — 20 October 2026

The owner verified leaflets and equivalence as working and explicitly requested a complete freeze. Locked commit: `933511cd5115a507c9a04f846640eb5c813e4938`; tag: `medicea-dev-locked-20261020`; verified deployment: `https://medicea-core-b4octdy5f-medmatchglobals-projects.vercel.app/`. Application code matches the 11:55 checkpoint `cc2a785`.

Only price investigation/corrections are authorised. Work separately on `investigation/price-only-20261020`; keep the working Dev branch and deployment unchanged. Do not alter leaflet generation, leaflet prompts, equivalence/origin identification, models, research caps, source rules, clinical validation, UI, navigation or session retention. Do not restore the later failed experiments. Existing requirements to consult the owner about core changes still apply to proposed price model/prompt/cap changes.

Run `node scripts/check-dev-lock.cjs` to verify an exact application freeze. For an explicitly scoped price-only patch, run `node scripts/check-dev-lock.cjs --price-only`; this permits changes only to `app/lib/leaflet-price.ts` among protected application files. Any other application-file change requires explicit owner approval. Documentation and investigation tests may be added separately. A passing guard is not authorisation to deploy to the locked Dev branch.

# Prompt preservation

The owner decides all core medicéa behaviour. Consult the owner before changing search scope, source restrictions, prompts, models, matching rules or workflows beyond the specifically approved task. On 20 October 2026 the owner explicitly approved removing fixed country/domain restrictions from the active human origin, destination-equivalent and leaflet research steps, and replacing them with web-wide research that prioritises authoritative, reliable evidence for the relevant product country. Do not reintroduce fixed source/country allowlists or generalise this approval to other core changes.

The owner requires the refined medicine, equivalent, generic, veterinary, leaflet, condition and supporting translation prompts to remain unchanged during UI work. Do not change their wording, model settings, composition matching or request routing without explicit authorization for that specific change. Run tests/prompt-preservation.cjs after relevant edits. Do not regenerate its baseline to accept an unintended change. UI labels and navigation are independent of search prompts.

# Brand preservation
Keep the owner's medicéa wordmark in its blue/teal styling, including inline mentions and translated interfaces. Use the shared MediceaBrand component for new inline branding; do not translate the brand name. Keep the existing photographic hero unless the owner explicitly requests a change.

# Authorised model-upgrade experiment
On 15 October 2026 the owner authorised targeted changes to leaflet handling and full ingredient/strength matching in the isolated model-upgrade branch, after approving live public-example API comparisons. The new gated summary and source-matching helpers are within that scope. Keep Production/flag-off legacy routes and the original protected prompt fixture intact; do not generalise this authorisation to unrelated prompts or deploy publicly.

The owner subsequently requested an accessible test version of the proposed revised prompts and new models. The exact `feature/openai-model-upgrade-preview` branch may default the experiment on only in Vercel Preview, with a visible revision/model banner and explicit-false kill switch. Shorten/refine the experimental origin/candidate prompts within this scope; preserve the protected original prompts, public Production behavior, other branches and clinical acceptance gates. Preview activation is for owner testing, not approval for public rollout.
