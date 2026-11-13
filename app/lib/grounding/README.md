# Isolated grounding evaluation

This module adapts the supplied Anthropic kit. It is deliberately not imported by a live route. It performs no requests and incurs no API cost. Download originals are preserved in `deliverables/grounding-kit-original` in the parent workspace.

Run offline: `node --test tests/grounding-kit.cjs`.

## Outcomes

- Complete, supported composition/form/route/release: confirmed compositional match, not proof of bioequivalence or personal suitability.
- Missing route/release, incomplete active lists, or additional unidentified active: `Possible Equivalent - Consult a GP or a Pharmacist`, in a separate possible-results section. Reasons remain visible. Never place these in confirmed results.
- Empty active list or malformed extraction: `Insufficient Information`. Do not infer that the product is not a medicine.
- Supported, known differences in active ingredients or strength/gating characteristics: not equivalent. Missing evidence cannot establish a confirmed mismatch either.

## Remaining integration requirements

1. **Evidence:** the research audit checks actual tool/result blocks and URL provenance. `ReviewedDocument` must come from an independent structured registry adapter or a human review. It binds facts to country, exact product identity, field path and a captured excerpt. Never manufacture this trusted context from the same model output: quote matching alone does not establish factual correctness. Without this context, results remain possible. A field's normalized value needs a verified mapping as well as the original excerpt.
2. **Normalization:** retain the raw label and opaque, case-sensitive terminology codes. Different code systems remain unresolved until reviewed crosswalk data exists. Populate required attributes and vocabulary from versioned terminology data; activate salt/form rules only after review with evidence. The evaluator does not supply a worldwide database or a pharmacist's approval. No new drug-specific exceptions were introduced.
3. **Excipients:** preserve full lists including coating/shell, each list's completeness, source and available quantities; warning ingredients are separate. Compare reviewed identities, show differences, never infer absence from partial/missing data. Do not rank a list as identical when quantities have not been established. The existing app's excipient presentation remains available for the eventual adapter.

Before live routing: implement registry adapters/terminology snapshots and extraction schema, configure and review the required form/route/release attributes, connect research/extraction responses to this evaluator, map confirmed/possible/insufficient results to separate UI sections, and test known country-pair cases. Keep the origin chooser, leaflets, pharmacy/GP search, conversation, pricing and prompts intact. Pricing is independent and not implemented by this module.

No automatic retries or schedules have been added. A future research/extraction transport must have explicit total token, search, wall-time and continuation limits; a retry consumes that same budget. Deployment and paid tests require the owner's separate approval.
