// app/api/translate/route.ts
import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

/**
 * POST body: { text: string, target: string }
 * Returns: { result: string }
 *
 * Preserves formatting (HTML/Markdown, bullet points, line breaks).
 */
export async function POST(req: NextRequest) {
  try {
    const { text, target } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Missing 'text' string" }, { status: 400 });
    }
    if (!target || typeof target !== "string") {
      return NextResponse.json({ error: "Missing 'target' string" }, { status: 400 });
    }

    const system =
      "You are a precise technical translator. Preserve all HTML/Markdown, bullets, line breaks, punctuation, numbers, and units. Do not add commentary—return translated text only.";

    const prompt = `Translate the following text into ${target}. Keep any HTML/Markdown exactly as-is.\n\n${text}`;

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
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return NextResponse.json({ error: `OpenAI error: ${errText}` }, { status: 500 });
    }

    const data = await resp.json();
    const translated: string =
      data?.choices?.[0]?.message?.content?.trim() ||
      data?.choices?.[0]?.message?.content ||
      "";

    return NextResponse.json({ result: translated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unknown translation error" },
      { status: 500 }
    );
  }
}
