import { NextResponse } from "next/server";
export const dynamic = "force-dynamic"; // don't cache on Vercel

export async function GET() {
  const key = process.env.OPENAI_API_KEY;
  return NextResponse.json({
    hasKey: Boolean(key),
    keyLen: key?.length ?? 0,
    nodeEnv: process.env.NODE_ENV,
    runtime: "node", // should be node on Vercel functions
  });
}
