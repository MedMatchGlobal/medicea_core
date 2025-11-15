// app/api/ai-search/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Helpful map so the prompt can say the language name clearly.
// If a code isn't listed, we fallback to the code itself.
const LANGUAGE_NAME: Record<string, string> = {
  en: "English",
  it: "Italiano",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
  pt: "Português",
  nl: "Nederlands",
  ru: "Русский",
  pl: "Polski",
  tr: "Türkçe",
  el: "Ελληνικά",
  sv: "Svenska",
  no: "Norsk",
  da: "Dansk",
  fi: "Suomi",
  cs: "Čeština",
  hu: "Magyar",
  ro: "Română",
  he: "עברית",
  ar: "العربية",
  zh: "中文",
  hi: "हिन्दी",
  ja: "日本語",
  ko: "한국어",
};

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // You already send `query` from page.tsx for the condition flow.
    // We also accept structured fields for flexibility.
    const lang: string = (body.lang || "en").toLowerCase();
    const languageName = LANGUAGE_NAME[lang] || lang;

    const selectedCondition: string = body.selectedCondition || "";
    const conditionDetails: string = body.conditionDetails || "";
    const allergies: string = body.userNotes || body.allergies || "";
    const originCountry: string = body.originCountry || "";
    const targetCountry: string = body.targetCountry || "";

    // Build a clean, deterministic instruction for the model.
    // Keep the same section style you're showing now (headings + bullets),
    // but FORCE the output language.
    const structuredInstruction = `
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
    `.trim();

    // Prefer the user's prebuilt query if present, but ensure language instruction wins
    const userQuery: string =
      (typeof body.query === "string" && body.query.trim()) || structuredInstruction;

    const resp = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      temperature: 0.2,
      max_tokens: 900,
      messages: [
        {
          role: "system",
          content:
            "You are an accurate, concise medical educator. Provide educational information, not diagnosis or personalized medical advice. Always follow the requested output language.",
        },
        { role: "user", content: userQuery + `\n\nIMPORTANT: Answer strictly in ${languageName}.` },
      ],
    });

    const text =
      resp.choices?.[0]?.message?.content?.trim() ||
      "No content received.";

    return NextResponse.json({ response: text });
  } catch (err: any) {
    console.error("ai-search error:", err?.message || err);
    return NextResponse.json(
      { error: "ai-search failed", detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}
