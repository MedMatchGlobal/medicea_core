export const maxDuration = 60;
import { openaiFetch } from "@/app/lib/openaiClient";
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function GET() {
  try {

    // Force the official endpoint (bypasses any Vercel AI Gateway)
    const resp = await openaiFetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",

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
