import {withMembership} from '@/lib/membership/meter';
export const maxDuration = 120;
import { openaiFetch, originIdentificationEnabled, experimentalPromptsEnabled as modelUpgradeEnabled, modelTestConfiguration } from "@/app/lib/openaiClient";
import { NextResponse } from "next/server";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

type ActiveIng = { name: string; strength: string };

// ---------- helpers ----------
function mapActivesToNamedSlots(actives: ActiveIng[]) {
  const ai: Record<string, string> = {
    AI1: "", Strength1: "",
    AI2: "", Strength2: "",
    AI3: "", Strength3: "",
    AI4: "", Strength4: "",
    AI5: "", Strength5: "",
  };
  const limit = Math.min(actives.length, 5);
  for (let i = 0; i < limit; i++) {
    const idx = i + 1;
    ai[`AI${idx}`] = (actives[i]?.name ?? "").trim();
    ai[`Strength${idx}`] = (actives[i]?.strength ?? "").trim();
  }
  return ai;
}

function splitDosageToStrengths(d: string): string[] {
  // Very lenient: split on + , ; or whitespace groups like "500mg + 30mg"
  return d
    .split(/(?:\+|,|;)/g)
    .map(s => s.trim())
    .filter(Boolean);
}

// Build "500 mg of Paracetamol together with 30 mg of Codeine Phosphate"
function buildExplicitList(pairs: { name: string; strength: string }[]) {
  return pairs
    .filter(p => p.name && p.strength)
    .map(p => `${p.strength} of ${p.name}`)
    .join(" together with ");
}

// Turn explicit list back into pairs for filtering (robust to units/spaces)
function explicitListToPairs(explicitList: string) {
  return explicitList
    .split(/together with/i)
    .map(s => s.trim())
    .filter(Boolean)
    .map(seg => {
      // expects "<strength> of <name>"
      const m = seg.match(/^(.+?)\s+of\s+(.+)$/i);
      if (!m) return null;
      return { strength: m[1].trim(), name: m[2].trim() };
    })
    .filter(Boolean) as { strength: string; name: string }[];
}

// Keep only lines that include ALL pairs as substrings (case-insensitive)
function filterRawToExactPairs(raw: string, explicitList: string) {
  const pairs = explicitListToPairs(explicitList);
  if (!pairs.length) return { filtered: raw, kept: [], dropped: [] };

  // Split model text into bullet-ish lines
  const lines = raw
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length);

  const kept: string[] = [];
  const dropped: string[] = [];

  for (const line of lines) {
    const L = line.toLowerCase();
    const ok = pairs.every(p => {
      const nameOk = L.includes(p.name.toLowerCase());
      // Normalize strength (e.g., "5 mg" vs "5mg")
      const strengthNorm = p.strength.replace(/\s*(mcg|µg|ug|mg|g|micrograms|milligrams|grams)\b/gi, m => ` ${m.toLowerCase()}`).replace(/\s+/g, " ").toLowerCase();
      const strengthAlt = strengthNorm.replace(/\s/g, ""); // "5 mg" → "5mg"
      const strengthOk = L.includes(strengthNorm) || L.includes(strengthAlt);
      return nameOk && strengthOk;
    });
    (ok ? kept : dropped).push(line);
  }

  // If nothing kept, return original (so you can still see what model said)
  if (!kept.length) {
    return { filtered: raw, kept, dropped };
  }
  return { filtered: kept.join("\n"), kept, dropped };
}

// Apply user dosage override if strength-count matches actives-count
function applyUserDosageOverride(
  actives: ActiveIng[],
  userDosage?: string | null
): ActiveIng[] {
  if (!userDosage) return actives;
  const parts = splitDosageToStrengths(userDosage);
  if (parts.length !== actives.length) return actives; // mismatch → ignore override
  return actives.map((ai, i) => ({ ...ai, strength: parts[i] }));
}

// --------------------------------------------------------------

async function generate(req: Request) {
  try {
    const { originCountry, drugName, drugDosage, targetCountry, originSelection } = await req.json();
    if(modelUpgradeEnabled?.()&&modelTestConfiguration?.().matchingMode==='prompt-test')return (await import('@/app/lib/prompt-matches')).promptMatchedSearch({drugName,originCountry,drugDosage,targetCountry,originSelection},'international');
    if(modelUpgradeEnabled?.()) return (await import("@/app/lib/source-matches")).sourceMatchedSearch({drugName,originCountry,drugDosage,targetCountry:targetCountry},"international");

    let identified:import('@/app/lib/origin-lookup').OriginProduct|undefined;
    if(originIdentificationEnabled?.()){
      if(typeof targetCountry!=='string'||!targetCountry.trim()||targetCountry.length>200)return NextResponse.json({error:'INVALID_INPUT'},{status:400});
      const result=await (await import('@/app/lib/origin-identification')).resolveIdentifiedOrigin({drugName,originCountry,drugDosage,originSelection});
      if(result instanceof Response)return result;
      identified=result;
    }
    // ---------- STEP 1: get origin profile ----------
    const system1 =
      "You are a structured medical data extractor. Return JSON only with medicine_name, origin_country, and active_ingredients[{name, strength}].";

    const user1 = `
Find the full composition (active ingredient names AND exact label strengths) of the medicine called "${drugName}"
sold in ${originCountry}${drugDosage ? ` (user-entered dosage hint: "${drugDosage}")` : ""}.
Return strictly JSON with keys: medicine_name, origin_country, active_ingredients[{name, strength}]. No extra text.
`.trim();

    let originProfile:any;
    if(identified){
      const {issueOriginSelection}=await import('@/app/lib/origin-lookup');
      originProfile={medicine_name:identified.name,origin_country:identified.country,active_ingredients:identified.ingredients,form:identified.form,route:identified.route,release:identified.release,excipients:identified.excipients,excipientStatus:identified.excipientStatus,sources:identified.sources,identification:identified.identification,selection_token:issueOriginSelection(identified,drugName)};
    }else{
    const response1 = await openaiFetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",

      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system1 },
          { role: "user", content: user1 },
        ],
      }),
    });

    const data1 = await response1.json();
    console.log("OPENAI STEP 1 RESPONSE:", JSON.stringify(data1, null, 2));
    originProfile = JSON.parse(data1.choices?.[0]?.message?.content || "{}");
    }

    if (!originProfile?.active_ingredients || originProfile.error) {
      return NextResponse.json({ error: "NOT_FOUND_ORIGIN", originProfile });
    }

    // Use the model-extracted actives, optionally override strengths from user dosage
    const baseActives: ActiveIng[] = originProfile.active_ingredients;
    const activesForSearch = identified ? baseActives : applyUserDosageOverride(baseActives, drugDosage);

    // Named slots (AI1..AI5 / Strength1..Strength5) for your UI/debug
    const named = mapActivesToNamedSlots(activesForSearch);

    // Build the explicit composition string used in the query
    const explicitList = buildExplicitList(activesForSearch);

    // ---------- STEP 2: ask for equivalents with the explicit composition ----------
    // EXACT, simple, temp=0
    const system2 = "You are a strict data retriever for licensed medicines. Output only the requested list; do not explain.";
const user2 = "Return preferably 10 products available in " + targetCountry + " that contain " + explicitList + ".";

let rawText:string;let destinationSources:string[]=[];
if(identified){
 const researched=await (await import('@/app/lib/equivalent-research')).researchEquivalentList(system2,user2,identified,targetCountry);
 rawText=researched.rawText;destinationSources=researched.sources;
}else{
const response2 = await openaiFetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",

      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0,
        seed: 12345,
        messages: [
          { role: "system", content: system2 },
          { role: "user", content: user2 },
        ],
      }),
    });

    const data2 = await response2.json();
    rawText = (data2.choices?.[0]?.message?.content || "").trim() || "No response.";
}

    // ---------- STEP 3: post-filter to exact pairwise matches ----------
    const { filtered, kept, dropped } = filterRawToExactPairs(rawText, explicitList);

    return NextResponse.json({
      originProfile,
      originProfileNamed: {
        ...named,
        CompositionSentence: explicitList, // mirrors what we asked for
      },
      equivalentResults: {
        target_country: targetCountry,
        search_composition: explicitList,
        raw_text: filtered || "No matches.",
        ...(identified?{sources:destinationSources,origin_sources:identified.sources,source_policy:'worldwide-country-authority-v1'}:{}),
        // Optional debug fields if you want to see what got removed:
        // dropped_lines: dropped,
      },
    });
  } catch (error: any) {
    console.error("Error in equivalent-search route:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", details: error.message },
      { status: 500 }
    );
  }
}

export const POST=withMembership(generate,'matches','international');
