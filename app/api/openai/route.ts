import { NextResponse } from "next/server";
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://api.openai.com/v1", // ⬅️ Force direct connection to OpenAI, bypass Vercel AI Gateway
});

export async function POST(req: Request) {
  const { drugName, originCountry } = await req.json();

  if (!drugName || !originCountry) {
    return NextResponse.json({ error: "Missing input" }, { status: 400 });
  }

  const prompt = `Tell me everything you know about the medicine "${drugName}" in ${originCountry}:
Include:
- Active ingredients with available strengths, dosages, and formulations
- Legal classification (Rx/OTC)
- Contraindications and precautions (age, pregnancy, allergy)
- Side effects
- Interactions
- Price in ${originCountry}
- Manufacturer or brands`;

  const system = `You are a cautious pharmacist. Only respond with factual and known information. Use the local currency for prices and never invent data.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
    });

    return NextResponse.json({ result: completion.choices[0].message.content });
  } catch (err: any) {
    console.error("OpenAI fetch failed:", err);
    return NextResponse.json({ error: "OpenAI call failed", detail: err.message }, { status: 500 });
  }
}
