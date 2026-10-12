import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? "";

/**
 * POST /api/admin/promote-device
 *
 * Headers:
 *   Authorization: Bearer <ADMIN_SECRET>
 *
 * Body (JSON):
 *   { "deviceId": "xxx", "label": "optional label" }
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Check admin secret
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : "";

    if (!ADMIN_SECRET || token !== ADMIN_SECRET) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Parse body
    const body = await req.json().catch(() => null);

    const deviceId = body?.deviceId as string | undefined;
    const label = body?.label as string | undefined;

    if (!deviceId || typeof deviceId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid deviceId" },
        { status: 400 }
      );
    }

    // 3. Upsert Device row as premium
    const id = randomUUID(); // needed because id has no default in schema

    const device = await prisma.device.upsert({
      where: { deviceId },
      update: {
        isPremium: true,
        label: label ?? undefined,
      },
      create: {
        id,
        deviceId,
        isPremium: true,
        label: label ?? null,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        device: {
          deviceId: device.deviceId,
          isPremium: device.isPremium,
          label: device.label,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error in /api/admin/promote-device:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
