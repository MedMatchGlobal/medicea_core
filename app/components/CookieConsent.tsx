"use client";

import { useEffect, useState } from "react";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const choice = localStorage.getItem("cookie-consent");
    if (!choice) {
      // Default denied until user decides
      // @ts-ignore
      window.gtag?.("consent", "default", {
        ad_storage: "denied",
        analytics_storage: "denied",
      });
      setVisible(true);
    } else if (choice === "accepted") {
      // @ts-ignore
      window.gtag?.("consent", "update", {
        ad_storage: "granted",
        analytics_storage: "granted",
      });
    }
  }, []);

  const accept = () => {
    localStorage.setItem("cookie-consent", "accepted");
    // @ts-ignore
    window.gtag?.("consent", "update", {
      ad_storage: "granted",
      analytics_storage: "granted",
    });
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem("cookie-consent", "declined");
    // @ts-ignore
    window.gtag?.("consent", "update", {
      ad_storage: "denied",
      analytics_storage: "denied",
    });
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 50,
      background: "white", borderTop: "1px solid #e5e7eb",
      padding: "12px 16px", display: "flex", gap: 12, alignItems: "center",
      justifyContent: "space-between", boxShadow: "0 -4px 12px rgba(0,0,0,0.06)"
    }}>
      <div style={{maxWidth: 750, fontSize: 14, lineHeight: 1.4}}>
        We use cookies for analytics to improve medicéa. You can accept or decline.
      </div>
      <div style={{display: "flex", gap: 8}}>
        <button onClick={decline} style={{padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8}}>Decline</button>
        <button onClick={accept} style={{padding: "8px 12px", background: "#2563eb", color: "white", borderRadius: 8}}>Accept</button>
      </div>
    </div>
  );
}
