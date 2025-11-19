// app/api/subscription/usage/route.ts

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const FREE_EQUIVALENT_LIMIT = 2;
const FREE_LEAFLET_LIMIT = 2;

type Feature = "EQUIVALENT_SEARCH" | "LEAFLET";

interface UsageBody {
  deviceId?: string | null;
  feature?: Feature;
}

export async function POST(req: NextRequest) {
  let body: UsageBody;

  try {
    body = (await req.json()) as UsageBody;
  } catch {
    body = {};
  }

  const feature = body.feature;
  const deviceId =
    body.deviceId || req.headers.get("x-medicea-device-id") || "";

  // If we somehow get here without a feature, don't hard-fail – just allow.
  if (!feature) {
    return NextResponse.json(
      {
        allowed: true,
        status: "FREE",
        reason: "MISSING_FEATURE",
      },
      { status: 200 }
    );
  }

  // If we have no deviceId (very old browser, disabled storage, etc.),
  // we also just allow and skip logging.
  if (!deviceId) {
    return NextResponse.json(
      {
        allowed: true,
        status: "FREE",
        reason: "NO_DEVICE_ID",
      },
      { status: 200 }
    );
  }

  try {
    // Upsert device so we always have a row for this deviceId
    const device = await prisma.device.upsert({
      where: { deviceId },
      create: {
        deviceId,
        isPremium: false,
      },
      update: {},
    });

    // If device is marked premium (mediceaGO), always allow, just log usage.
    if (device.isPremium) {
      try {
        await prisma.usageLog.create({
          data: {
            deviceId,
            feature,
          },
        });
      } catch (err) {
        console.error("Error logging premium usage", err);
      }

      return NextResponse.json(
        {
          allowed: true,
          status: "PREMIUM" as const,
        },
        { status: 200 }
      );
    }

    // ---- FREE device: enforce monthly limits ----

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const count = await prisma.usageLog.count({
      where: {
        deviceId,
        feature,
        createdAt: {
          gte: startOfMonth,
          lt: endOfMonth,
        },
      },
    });

    const limit =
      feature === "EQUIVALENT_SEARCH"
        ? FREE_EQUIVALENT_LIMIT
        : FREE_LEAFLET_LIMIT;

    const allowed = count < limit;

    // Log this usage attempt (whether allowed or blocked)
    try {
      await prisma.usageLog.create({
        data: {
          deviceId,
          feature,
        },
      });
    } catch (err) {
      console.error("Error logging free usage", err);
    }

    if (!allowed) {
      return NextResponse.json(
        {
          allowed: false,
          status: "FREE" as const,
          reason: "LIMIT_REACHED",
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        allowed: true,
        status: "FREE" as const,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error in /api/subscription/usage", err);
    // Fails open: do not break user experience on backend errors
    return NextResponse.json(
      {
        allowed: true,
        status: "FREE",
        reason: "INTERNAL_ERROR",
      },
      { status: 200 }
    );
  }
}
