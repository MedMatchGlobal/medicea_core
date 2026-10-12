export const maxDuration = 60;
import { openaiFetch } from "@/app/lib/openaiClient";
// app/api/triage/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { messages } = await req.json();

  try {
    const response = await openaiFetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',

      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: errorText || 'OpenAI request failed' }, { status: 500 });
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content || 'No response';

    // 🔥 Return message directly as plain text, not as { message: "..." }
    return new Response(message);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unexpected error' }, { status: 500 });
  }
}
