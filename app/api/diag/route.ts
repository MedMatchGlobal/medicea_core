import { NextResponse } from "next/server";
import { getOpenAIKeyCount } from "@/app/lib/openaiClient";
export const dynamic = "force-dynamic";

export async function GET() {
  const keyCount = getOpenAIKeyCount();
  return NextResponse.json({
    hasKey: keyCount > 0, keyCount,
    nodeEnv: process.env.NODE_ENV, runtime: "node",
  });
}
