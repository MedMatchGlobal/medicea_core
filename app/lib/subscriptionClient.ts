// app/lib/subscriptionClient.ts

import { getDeviceId } from "./usageTracker";

export type ClientFeature = "equivalentSearch" | "leaflet";

type ApiFeature = "EQUIVALENT_SEARCH" | "LEAFLET";

function mapFeature(feature: ClientFeature): ApiFeature {
  return feature === "equivalentSearch" ? "EQUIVALENT_SEARCH" : "LEAFLET";
}

export interface UsageResponse {
  allowed: boolean;
  status: "FREE" | "PREMIUM";
  reason?: string;
}

export async function registerUsage(
  feature: ClientFeature
): Promise<UsageResponse> {
  const deviceId = getDeviceId();

  try {
    const res = await fetch("/api/subscription/usage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        deviceId,
        feature: mapFeature(feature),
      }),
    });

    if (!res.ok) {
      // Soft fallback: do not block users just because the backend failed.
      console.warn(
        "registerUsage: backend returned non-OK status",
        res.status
      );
      return { allowed: true, status: "FREE", reason: "SERVER_ERROR" };
    }

    const data = (await res.json()) as UsageResponse;
    return data;
  } catch (err) {
    console.error("registerUsage error", err);
    // Again, do not block users on network issues.
    return { allowed: true, status: "FREE", reason: "NETWORK_ERROR" };
  }
}
