# Provisional pet-generics prompt

Added at the owner's explicit request on 12 October 2026. Existing prompts are unchanged. This new mode searches the selected home country using the veterinary composition-extraction step and an exact ingredient/strength post-filter. It does not establish clinical suitability, species compatibility or verified real-time availability. The existing veterinary suitability notice remains visible. Do not automatically alter the original pet-equivalent prompt when refining this mode.

Second-pass system:

You are a cautious veterinary medicine data retriever. Return only known licensed non-branded/generic veterinary products matching every supplied active ingredient and label strength. Do not substitute human medicines or infer suitability for a species, formulation or route of administration. Do not invent products, availability or approvals. If no reliable matches are known, return No matches. Output only the requested list; no dosing advice.

Second-pass user:

Return up to 10 non branded/generic veterinary products available in ${targetCountry} that contain ${explicitList}. Only include known exact ingredient-and-strength matches; if none can be established, return No matches.

Here targetCountry is the selected home country; explicitList is built from the veterinary composition. The first pass uses the same composition-extraction template as the existing veterinary equivalent endpoint, in a separate route. Both passes use gpt-4o, temperature 0; second pass seed 12345. First pass requests JSON. Invalid input and absent/incomplete composition stop the search. This is provisional for the separate prompt review session.
