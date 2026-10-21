# Co Efferalgan omission and restored return controls

The owner requested an explanation of the missing Co Efferalgan result and restoration of Back to Search Results. This update changes only leaflet navigation in the isolated frontend Preview. No matching prompt, comparison rule, model, search cap, leaflet request or source restriction is changed in this update.

## Confirmed diagnostic

A fixed public UK Co-codamol 30/500 → Italy call through the unchanged handler returned:

- Origin: codeine phosphate hemihydrate 30 mg and paracetamol 500 mg, conventional oral immediate-release tablet.
- Discovery: Co-Efferalgan **effervescent** 500/30 and Tachidol tablet 500/30.
- Fresh catalogue lookup: only the **effervescent** Co-Efferalgan form; conventional and effervescent Tachidol forms.
- Comparison: conventional Tachidol retained; effervescent forms rejected against the selected conventional tablet.

Co Efferalgan is therefore omitted through two interacting causes: model-memory catalogue coverage omits its film-coated variant, and the explicitly introduced formulation comparison rejects the effervescent version that is returned. This is below the existing result-count caps, not a cap truncation. The added comparison is a background change compared with legacy Production and must be disclosed as such. No additional fixed website/country allowlist was introduced; this GPT-4o Chat Completions flow makes no web-search or external medicines-register request at all.

The separate GPT-4o catalogue request reduces strength anchoring, but it is not an exhaustive or independent regulatory database. An assertion such as `variants_complete:true` is model output and does not establish completeness. The previous passing checks demonstrated one positive 30/500 result and strength separation, not all available Italian medicines. Providing every licensed/currently marketed product reliably requires a source-backed catalogue and an explicitly agreed definition of availability; pharmacy stock is a further separate issue. No extra matching restriction or hardcoded product was added to mask the omission.

## Navigation restoration

- Back to Search Results now appears at the top and bottom of the original medicine leaflet.
- Equivalent leaflets retain the existing top control and gain a bottom control.
- Returning collapses original and equivalent leaflets and scrolls to the retained search-results summary. It preserves results, loaded leaflet text, saved searches and the selected composition; it does not start a new lookup.
- Existing labels in all 25 supported languages are reused. Standalone leaflet results also get the return control.

The immutable Production comparisons and protected prompt fixture remain unchanged. The frontend preservation test still checks navigation/persistence modules verbatim and now checks search/request handlers verbatim, allowing the specifically requested return controls in MedicineWorkspace. All 24 relevant Production/prompt, saved-search and session checks and the Next.js/TypeScript build pass.
