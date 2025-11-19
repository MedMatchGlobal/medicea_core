// app/lib/usageTracker.ts

/**
 * Local, client-side usage tracker for FREE tier.
 *
 * NOTE:
 * - Server-side enforcement happens in /api/subscription/usage.
 * - This file is only for UI/UX and quick blocking before hitting the server.
 */

type Feature = "equivalentSearch" | "leaflet";

const STORAGE_KEY = "medicea-usage-v1";
const DEVICE_ID_KEY = "medicea-device-id";
const PREMIUM_DEVICE_TOKEN_KEY = "medicea-premium-device-token";

// Keep these in sync with your backend free limits
const FREE_EQUIVALENT_LIMIT = 2;
const FREE_LEAFLET_LIMIT = 2;

interface UsageState {
  month: string; // "YYYY-MM"
  equivalentSearchCount: number;
  leafletCount: number;
}

function getCurrentMonthKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function safeParseUsage(raw: string | null): UsageState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed &&
      typeof parsed.month === "string" &&
      typeof parsed.equivalentSearchCount === "number" &&
      typeof parsed.leafletCount === "number"
    ) {
      return parsed as UsageState;
    }
    return null;
  } catch {
    return null;
  }
}

function readUsage(): UsageState {
  if (typeof window === "undefined") {
    // SSR fallback – never block on server
    return {
      month: getCurrentMonthKey(),
      equivalentSearchCount: 0,
      leafletCount: 0,
    };
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  const parsed = safeParseUsage(raw);
  const currentMonth = getCurrentMonthKey();

  if (!parsed || parsed.month !== currentMonth) {
    return {
      month: currentMonth,
      equivalentSearchCount: 0,
      leafletCount: 0,
    };
  }

  return parsed;
}

function writeUsage(usage: UsageState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
  } catch {
    // ignore quota / privacy mode errors
  }
}

/**
 * Device ID (used to tie client usage to backend Device table).
 */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "";

  let id = window.localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    // Prefer crypto.randomUUID when available
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      id = (crypto as any).randomUUID();
    } else {
      id =
        Math.random().toString(36).slice(2) +
        "-" +
        Date.now().toString(36);
    }
    try {
      window.localStorage.setItem(DEVICE_ID_KEY, id);
    } catch {
      // ignore
    }
  }

  return id;
}

/**
 * Optional local-only switch to mark a device as "premium" (GO)
 * without hitting the backend. Currently NOT used in production,
 * but kept for possible experiments. Server-side premium is the
 * source of truth.
 */
export function markDevicePremiumLocal(token: string = "1"): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREMIUM_DEVICE_TOKEN_KEY, token || "1");
  } catch {
    // ignore
  }
}

function isPremiumDeviceLocal(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const val = window.localStorage.getItem(PREMIUM_DEVICE_TOKEN_KEY);
    return !!val && val !== "0";
  } catch {
    return false;
  }
}

/**
 * Returns true if the FREE tier still has local quota remaining
 * for the given feature. Premium devices are always allowed.
 */
export function hasFreeQuota(feature: Feature): boolean {
  if (isPremiumDeviceLocal()) return true;

  const usage = readUsage();
  if (feature === "equivalentSearch") {
    return usage.equivalentSearchCount < FREE_EQUIVALENT_LIMIT;
  } else {
    return usage.leafletCount < FREE_LEAFLET_LIMIT;
  }
}

/**
 * Increment local usage counters (FREE tier only).
 * Premium devices do NOT increment local counters.
 */
export function incrementUsage(feature: Feature): void {
  if (isPremiumDeviceLocal()) return;

  const usage = readUsage();
  if (feature === "equivalentSearch") {
    usage.equivalentSearchCount += 1;
  } else {
    usage.leafletCount += 1;
  }
  writeUsage(usage);
}
