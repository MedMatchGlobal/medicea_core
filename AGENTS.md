# Prompt preservation

The owner requires the refined medicine, equivalent, generic, veterinary, leaflet, condition and supporting translation prompts to remain unchanged during UI work. Do not change their wording, model settings, composition matching or request routing without explicit authorization for that specific change. Run tests/prompt-preservation.cjs after relevant edits. Do not regenerate its baseline to accept an unintended change. UI labels and navigation are independent of search prompts.

# Brand preservation
Keep the owner's medicéa wordmark in its blue/teal styling, including inline mentions and translated interfaces. Use the shared MediceaBrand component for new inline branding; do not translate the brand name. Keep the existing photographic hero unless the owner explicitly requests a change.

# Authorised model-upgrade experiment
On 15 October 2026 the owner authorised targeted changes to leaflet handling and full ingredient/strength matching in the isolated model-upgrade branch, after approving live public-example API comparisons. The new gated summary and source-matching helpers are within that scope. Keep Production/flag-off legacy routes and the original protected prompt fixture intact; do not generalise this authorisation to unrelated prompts or deploy publicly.

The owner subsequently requested an accessible test version of the proposed revised prompts and new models. The exact `feature/openai-model-upgrade-preview` branch may default the experiment on only in Vercel Preview, with a visible revision/model banner and explicit-false kill switch. Shorten/refine the experimental origin/candidate prompts within this scope; preserve the protected original prompts, public Production behavior, other branches and clinical acceptance gates. Preview activation is for owner testing, not approval for public rollout.
