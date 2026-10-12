# Exact prompt templates

Audited against pre-feedback commit 0f327f3. API prompts are unchanged. The condition query has been restored verbatim. Variables such as ${drugName} are substituted at runtime; these are exact TypeScript template expressions, not paraphrases.

## app/api/openai/equivalent-search/route.ts

### system1

```typescript
"You are a structured medical data extractor. Return JSON only with medicine_name, origin_country, and active_ingredients[{name, strength}]."
```

### user1

```typescript
`
Find the full composition (active ingredient names AND exact label strengths) of the medicine called "${drugName}"
sold in ${originCountry}${drugDosage ? ` (user-entered dosage hint: "${drugDosage}")` : ""}.
Return strictly JSON with keys: medicine_name, origin_country, active_ingredients[{name, strength}]. No extra text.
`.trim()
```

### model

```typescript
"gpt-4o"
```

### temperature

```typescript
0
```

### response_format

```typescript
{ type: "json_object" }
```

### message content

```typescript
system1
```

### message content

```typescript
user1
```

### system2

```typescript
"You are a strict data retriever for licensed medicines. Output only the requested list; do not explain."
```

### user2

```typescript
"Return preferably 10 products available in " + targetCountry + " that contain " + explicitList + "."
```

### model

```typescript
"gpt-4o"
```

### temperature

```typescript
0
```

### seed

```typescript
12345
```

### message content

```typescript
system2
```

### message content

```typescript
user2
```

## app/api/openai/generics/route.ts

### system1

```typescript
"You are a structured medical data extractor. Return JSON only with medicine_name, origin_country, and active_ingredients[{name, strength}]."
```

### user1

```typescript
`
Find the full composition (active ingredient names AND exact label strengths) of the medicine called "${drugName}"
sold in ${originCountry}${drugDosage ? ` (user-entered dosage hint: "${drugDosage}")` : ""}.
Return strictly JSON with keys: medicine_name, origin_country, active_ingredients[{name, strength}]. No extra text.
`.trim()
```

### model

```typescript
"gpt-4o"
```

### temperature

```typescript
0
```

### response_format

```typescript
{ type: "json_object" }
```

### message content

```typescript
system1
```

### message content

```typescript
user1
```

### system2

```typescript
"You are a strict data retriever for licensed medicines. Output only the requested list; do not explain."
```

### user2

```typescript
`Return preferably 10 non branded/generic products available in ${originCountry} that contain ${explicitList}.`.trim()
```

### model

```typescript
"gpt-4o"
```

### temperature

```typescript
0
```

### seed

```typescript
12345
```

### message content

```typescript
system2
```

### message content

```typescript
user2
```

## app/api/openai/pets/route.ts

### system1

```typescript
"You are a structured veterinary medical data extractor. Return JSON only with medicine_name, origin_country, and active_ingredients[{name, strength}]."
```

### user1

```typescript
`
Find the full composition (active ingredient names AND exact label strengths) of the veterinary medicine called "${drugName}"
sold in ${originCountry}${drugDosage ? ` (user-entered dosage hint: "${drugDosage}")` : ""}.
Return strictly JSON with keys: medicine_name, origin_country, active_ingredients[{name, strength}]. No extra text.
`.trim()
```

### model

```typescript
"gpt-4o"
```

### temperature

```typescript
0
```

### response_format

```typescript
{ type: "json_object" }
```

### message content

```typescript
system1
```

### message content

```typescript
user1
```

### system2

```typescript
"You are a strict data retriever for licensed veterinary medicines. Output only the requested list; do not explain."
```

### user2

```typescript
`Return preferably 10 veterinary products available in ${targetCountry} that contain ${explicitList}.`.trim()
```

### model

```typescript
"gpt-4o"
```

### temperature

```typescript
0
```

### seed

```typescript
12345
```

### message content

```typescript
system2
```

### message content

```typescript
user2
```

## app/api/openai/leaflet/route.ts

### system

```typescript
`
You are a knowledgeable and factual medical assistant who writes concise, easy-to-read medicine leaflets for the general public and add indicative price, strength and legal classification.
Close with average selling price.
Return the result as plain JSON with just one key: "leaflet_text".
Do not invent data if unavailable; use "Not specified" instead.
`.trim()
```

### user

```typescript
`
Fetch the official medicine leaflet for ${drugName} sold in ${originCountry}.
`.trim()
```

### model

```typescript
"gpt-4o"
```

### temperature

```typescript
0.2
```

### seed

```typescript
12345
```

### message content

```typescript
system
```

### message content

```typescript
user
```

### translatorSystem

```typescript
`
You are a precise medical translator. Translate the leaflet content into the target language while preserving structure and bullet points.
Do NOT change section headings — keep them in English so they remain detectable by the client formatter.
Keep list bullets using "-" or numbered lists. Do not add extra commentary.
Return JSON with exactly one top-level key: "leaflet_text".
`.trim()
```

### translatorUser

```typescript
`
Target language: ${language}

Translate ONLY the body prose of each section into the target language.
Keep section headings in ENGLISH (e.g., "Active Ingredients", "Uses", "Dosage", "Contraindications", "Warnings", "Precautions", "Side Effects", "Storage", "Legal Classification", "Average Selling Price", "Manufacturer", "Overview", "Description", "Interactions", "Mechanism of Action", "Note", "Disclaimer").

Source leaflet_text:
${leafletText}
`.trim()
```

### model

```typescript
"gpt-4o"
```

### temperature

```typescript
0.2
```

### message content

```typescript
translatorSystem
```

### message content

```typescript
translatorUser
```

## app/api/openai/route.ts

### prompt

```typescript
`Tell me everything you know about the medicine "${drugName}" in ${originCountry}:
Include:
- Active ingredients with available strengths, dosages, and formulations
- Legal classification (Rx/OTC)
- Contraindications and precautions (age, pregnancy, allergy)
- Side effects
- Interactions
- Price in ${originCountry}
- Manufacturer or brands`
```

### system

```typescript
`You are a cautious pharmacist. Only respond with factual and known information. Use the local currency for prices and never invent data.`
```

### model

```typescript
"gpt-4"
```

### message content

```typescript
system
```

### message content

```typescript
prompt
```

### temperature

```typescript
0.2
```

## app/api/ai-search/route.ts

### structuredInstruction

```typescript
`
You are a careful medical educator. Write **strictly in ${languageName}**.

Task: Provide a short educational overview for the following condition.
- Condition: "${selectedCondition || "N/A"}"
- Extra context (patient-provided): "${conditionDetails || "N/A"}"
- Allergies / comorbidities (if any): "${allergies || "N/A"}"
- Country context (optional): Home="${originCountry || "-"}", Target="${targetCountry || "-"}"

Guidance:
- This is **educational information only**, not medical advice or diagnosis.
- Use clear, plain language, suitable for the public.
- Prefer concise paragraphs and bullet points.
- Include sections with headings (in ${languageName}):
  - Educational Overview
  - Key Symptoms
  - Red Flags / When to Seek Care Now
  - Typical Treatments
  - Notes or Lifestyle Considerations
- Do **not** fabricate dosages or specific personal recommendations.
- If a section is not applicable, omit it.
    `.trim()
```

### model

```typescript
process.env.OPENAI_MODEL || "gpt-4o"
```

### temperature

```typescript
0.2
```

### max_tokens

```typescript
900
```

### message content

```typescript
"You are an accurate, concise medical educator. Provide educational information, not diagnosis or personalized medical advice. Always follow the requested output language."
```

### message content

```typescript
userQuery + `\n\nIMPORTANT: Answer strictly in ${languageName}.`
```

## app/api/translate/route.ts

### system

```typescript
"You are a precise technical translator. Preserve all HTML/Markdown, bullets, line breaks, punctuation, numbers, and units. Do not add commentary—return translated text only."
```

### prompt

```typescript
`Translate the following text into ${target}. Keep any HTML/Markdown exactly as-is.\n\n${text}`
```

### model

```typescript
MODEL
```

### temperature

```typescript
0.2
```

### message content

```typescript
system
```

### message content

```typescript
prompt
```

## app/api/translate-json/route.ts

### system

```typescript
"You translate JSON VALUES but must preserve all KEYS exactly as they are. " +
      "Return ONLY valid JSON (no code fences, no explanations). " +
      "Rules: (1) Keep keys unchanged. (2) Translate every string value into the target language. " +
      "(3) Preserve ALL HTML tags and Markdown in values. (4) Preserve units, numbers, and symbols. " +
      "(5) Never add/remove/reorder fields. (6) If a value contains JSON or HTML, keep its structure intact."
```

### user

```typescript
`Target language: ${targetLanguage}\n` +
      "Task: Translate every STRING VALUE in the following JSON object into the target language. " +
      "Keep KEYS as-is. Keep HTML/Markdown intact. Return ONLY JSON.\n\n" +
      jsonStr
```

### model

```typescript
MODEL
```

### temperature

```typescript
0.2
```

### message content

```typescript
system
```

### message content

```typescript
user
```

## app/MedicineWorkspace.tsx

### query

```typescript
`
You are a careful medical information assistant. Write in ${lang}. Audience: layperson.
**Do NOT diagnose. Do NOT give specific doses.** Use metric units. If something is unknown, say "Not available".

Condition: "${selectedCondition}"
Country focus: ${country || 'Not specified'}
User context (optional): ${conditionDetails || 'None'}
Allergies / other conditions (optional): ${userNotes || 'None'}

Return **clear, concise Markdown** with these sections and short bullet points where natural. Use localized headings if obvious in ${lang}:

1) Quick summary — 100 words max.
2) What it usually is & common causes — bullets.
3) What you can do now (self-care & lifestyle) — bullets; safe, generic, no dosing.
4) Medicines in ${country || "the user's country"} — split into **OTC vs Rx**; generic examples only; note if access requires a prescription or pharmacist consultation.
5) How to navigate the healthcare system in ${country || "the user's country"} — step-by-step (e.g., pharmacist → GP/primary care → specialist; how referrals/urgent care typically work). Include useful links on the healthcare system in ${country || "the user's country"}.
6) What to say to a pharmacist/doctor — 1–2 short example phrases the user can read out **in ${lang}**.
7) Red flags — bullet list of symptoms that require urgent care **now**.
8) Special populations — pregnancy, children, older adults, chronic conditions (concise bullets).
9) Trusted authorities to search — name national services/regulator (e.g., NHS, Ministry of Health, medicines regulator). **Names only; no links.**
10) Recommendations

Tone: calm, supportive, non-alarming. Be country-aware about access rules and pathways. Keep it compact.
`.trim()
```

## Routing and composition

International equivalents use equivalent-search; generic search uses generics; pets use pets; leaflets use leaflet. Ingredient composition is assembled as `${strength} of ${name}`, joined with ` together with `. Pairwise post-filtering is unchanged. Leaflet translation runs for non-English UI languages. The condition query goes to ai-search, which appends `IMPORTANT: Answer strictly in ${languageName}.` to the user message. Triage uses ai-search with the typed text; its submitted history is not used by that endpoint. The separate /api/triage endpoint forwards supplied messages but is not called by this UI. /api/openai is a separate medicine-information endpoint, not the main equivalent-search path. Moving pet navigation did remove the automatic human leaflet request from the pet flow; the veterinary search prompt itself is unchanged.
