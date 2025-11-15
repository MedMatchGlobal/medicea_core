"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const GA_ID = "G-CSY32ESDM8";

export default function GATracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined" || !(window as any).gtag) return;
    const url = pathname + (searchParams?.toString() ? `?${searchParams}` : "");
    (window as any).gtag("config", GA_ID, { page_path: url });
  }, [pathname, searchParams]);

  return null;
}
