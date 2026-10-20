import {withMembership} from '@/lib/membership/meter';
export const maxDuration = 120;
import { NextResponse } from "next/server";
import { createChatCompletion,travelSolEnabled } from "@/app/lib/openaiClient";

async function generate(req: Request) {
  const input=await req.json();
  const { drugName, originCountry } = input;
  if(travelSolEnabled?.()){
    const response=await (await import('@/app/lib/structured-leaflet')).structuredLeaflet(input);
    const data=await response.json();return NextResponse.json({...data,...(response.ok?{result:data.leaflet.leaflet_text}:{})},{status:response.status});
  }

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
    const completion = await createChatCompletion({
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

export const POST=withMembership(generate,'text');
