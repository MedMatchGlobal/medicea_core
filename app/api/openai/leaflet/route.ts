import { NextResponse } from "next/server";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export async function POST(req: Request) {
  try {
    // Read request body (adds 'lang' support)
    const { originCountry, drugName, drugDosage, lang } = await req.json();
    const language = (lang || "en").trim().toLowerCase();

    // ------------------ ORIGINAL PROMPTS (UNCHANGED) ------------------
    const system = `
You are a knowledgeable and factual medical assistant who writes concise, easy-to-read medicine leaflets for the general public and add indicative price, strength and legal classification.
Close with average selling price.
Return the result as plain JSON with just one key: "leaflet_text".
Do not invent data if unavailable; use "Not specified" instead.
`.trim();

    const user = `
Fetch the official medicine leaflet for ${drugName} sold in ${originCountry}.
`.trim();
    // ------------------------------------------------------------------

    // First pass: generate leaflet as you did before
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.2,
        seed: 12345,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content ?? "{}";

    // Extract leaflet_text from the model's JSON (or fallback to raw)
    let leafletText = "No leaflet generated.";
    try {
      leafletText = JSON.parse(raw).leaflet_text ?? raw;
    } catch {
      leafletText = raw;
    }

    // ------------------ SECOND PASS (TRANSLATION) ------------------
    // Only translate when a non-English UI language is requested.
    // We keep section headings in ENGLISH so your frontend formatter can parse
    // sections and replace headings with localized labels.
    if (language !== "en" && leafletText && leafletText.trim().length > 0) {
      const translatorSystem = `
You are a precise medical translator. Translate the leaflet content into the target language while preserving structure and bullet points.
Do NOT change section headings — keep them in English so they remain detectable by the client formatter.
Keep list bullets using "-" or numbered lists. Do not add extra commentary.
Return JSON with exactly one top-level key: "leaflet_text".
`.trim();

      const translatorUser = `
Target language: ${language}

Translate ONLY the body prose of each section into the target language.
Keep section headings in ENGLISH (e.g., "Active Ingredients", "Uses", "Dosage", "Contraindications", "Warnings", "Precautions", "Side Effects", "Storage", "Legal Classification", "Average Selling Price", "Manufacturer", "Overview", "Description", "Interactions", "Mechanism of Action", "Note", "Disclaimer").

Source leaflet_text:
${leafletText}
`.trim();

      const translateResp = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          temperature: 0.2,
          messages: [
            { role: "system", content: translatorSystem },
            { role: "user", content: translatorUser },
          ],
        }),
      });

      const tData = await translateResp.json();
      const tRaw = tData?.choices?.[0]?.message?.content ?? "{}";

      try {
        const parsed = JSON.parse(tRaw);
        if (parsed && typeof parsed.leaflet_text === "string") {
          leafletText = parsed.leaflet_text;
        } else {
          // Fallback: if the model returned plain text, use it
          leafletText = tRaw;
        }
      } catch {
        // If not valid JSON, still use the raw translated text
        leafletText = tRaw;
      }
    }
    // ----------------------------------------------------------------

    return NextResponse.json({
      leaflet: {
        medicine_name: drugName,
        country: originCountry,
        dosage_hint: drugDosage || null,
        leaflet_text: (leafletText || "").trim(),
        lang: language,
      },
    });
  } catch (error: any) {
    console.error("Error generating leaflet:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", details: error.message },
      { status: 500 }
    );
  }
}
