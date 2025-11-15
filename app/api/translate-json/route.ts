// app/api/translate-json/route.ts
import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

// Map short codes to full, unambiguous language names
const LANGUAGE_NAME: Record<string, string> = {
  en: "English",
  it: "Italian",
  fr: "French",
  de: "German",
  es: "Spanish",
  pt: "Portuguese",
  nl: "Dutch",
  af: "Afrikaans",
  ru: "Russian",
  pl: "Polish",
  tr: "Turkish",
  el: "Greek",
  sv: "Swedish",
  no: "Norwegian",
  da: "Danish",
  fi: "Finnish",
  cs: "Czech",
  hu: "Hungarian",
  ro: "Romanian",
  he: "Hebrew",
  ar: "Arabic",
  zh: "Chinese (Simplified)",
  hi: "Hindi",
  ja: "Japanese",
  ko: "Korean",
};

export async function POST(req: NextRequest) {
  try {
    const { data, lang } = await req.json();

    if (!data || typeof data !== "object") {
      return NextResponse.json({ error: "Missing or invalid 'data' object" }, { status: 400 });
    }
    if (!lang || typeof lang !== "string") {
      return NextResponse.json({ error: "Missing 'lang' string" }, { status: 400 });
    }

    const targetLanguage =
      LANGUAGE_NAME[lang.toLowerCase()] || // map codes like "it" → "Italian"
      lang; // allow full names already

    const jsonStr = JSON.stringify(data);

    const system =
      "You translate JSON VALUES but must preserve all KEYS exactly as they are. " +
      "Return ONLY valid JSON (no code fences, no explanations). " +
      "Rules: (1) Keep keys unchanged. (2) Translate every string value into the target language. " +
      "(3) Preserve ALL HTML tags and Markdown in values. (4) Preserve units, numbers, and symbols. " +
      "(5) Never add/remove/reorder fields. (6) If a value contains JSON or HTML, keep its structure intact.";

    const user =
      `Target language: ${targetLanguage}\n` +
      "Task: Translate every STRING VALUE in the following JSON object into the target language. " +
      "Keep KEYS as-is. Keep HTML/Markdown intact. Return ONLY JSON.\n\n" +
      jsonStr;

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return NextResponse.json({ error: `OpenAI error: ${errText}` }, { status: 500 });
    }

    const dataOut = await resp.json();
    let content: string =
      dataOut?.choices?.[0]?.message?.content?.trim() ??
      dataOut?.choices?.[0]?.message?.content ??
      "";

    // Strip any accidental code fences
    content = content.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      const start = content.indexOf("{");
      const end = content.lastIndexOf("}");
      if (start !== -1 && end > start) {
        const candidate = content.slice(start, end + 1);
        parsed = JSON.parse(candidate);
      } else {
        throw new Error("Model did not return valid JSON.");
      }
    }

    return NextResponse.json({ result: parsed });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unknown translation error" },
      { status: 500 }
    );
  }
}
