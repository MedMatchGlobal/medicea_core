import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      return NextResponse.json({ ok: false, reason: "no OPENAI_API_KEY" }, { status: 500 });
    }

    // Force the official endpoint (bypasses any Vercel AI Gateway)
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Reply with OK only" }],
        temperature: 0,
      }),
    });

    const text = await resp.text(); // keep as text for easier debugging
    return NextResponse.json({ ok: resp.ok, status: resp.status, body: text.slice(0, 500) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, crash: String(e?.message || e) }, { status: 500 });
  }
}
