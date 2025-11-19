// app/api/subscription/route.ts
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const FREE_EQUIVALENT_LIMIT = 2;
const FREE_LEAFLET_LIMIT = 2;

export async function GET(req: NextRequest) {
  try {
    const deviceId = req.headers.get("x-medicea-device-id");

    if (!deviceId) {
      return NextResponse.json({
        status: "FREE" as const,
        isLoggedIn: false,
        equivalentUsed: 0,
        equivalentLimit: FREE_EQUIVALENT_LIMIT,
        leafletUsed: 0,
        leafletLimit: FREE_LEAFLET_LIMIT,
        isPremiumDevice: false,
      });
    }

    const device = await prisma.device.upsert({
      where: { deviceId },
      update: {},
      create: { deviceId, label: null },
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [equivalentCount, leafletCount] = await Promise.all([
      prisma.usageLog.count({
        where: {
          deviceId: device.id,
          feature: "EQUIVALENT_SEARCH",
          createdAt: { gte: startOfMonth, lt: endOfMonth },
        },
      }),
      prisma.usageLog.count({
        where: {
          deviceId: device.id,
          feature: "LEAFLET",
          createdAt: { gte: startOfMonth, lt: endOfMonth },
        },
      }),
    ]);

    const isPremium = device.isPremium;

    return NextResponse.json({
      status: isPremium ? ("PREMIUM" as const) : ("FREE" as const),
      isLoggedIn: false,
      equivalentUsed: equivalentCount,
      equivalentLimit: FREE_EQUIVALENT_LIMIT,
      leafletUsed: leafletCount,
      leafletLimit: FREE_LEAFLET_LIMIT,
      isPremiumDevice: isPremium,
    });
  } catch (error) {
    console.error("Error in /api/subscription", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
