"use client";

import { useEffect, useState } from "react";
import { getDeviceId } from "../../lib/usageTracker";

export default function DeviceDebugPage() {
  const [id, setId] = useState<string>("");

  useEffect(() => {
    try {
      const d = getDeviceId();
      setId(d);
    } catch (err) {
      console.error(err);
    }
  }, []);

  return (
    <main
      style={{
        maxWidth: 600,
        margin: "2rem auto",
        padding: "1rem",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
      }}
    >
      <h1 style={{ fontSize: "1.3rem", marginBottom: "0.5rem" }}>
        Device ID (medicea)
      </h1>
      <p style={{ marginBottom: "0.5rem" }}>
        This ID identifies this device for mediceaGO / usage limits.
      </p>
      {id ? (
        <>
          <pre
            style={{
              padding: "0.75rem",
              borderRadius: 8,
              background: "#f3f4f6",
              overflowX: "auto",
              fontSize: "0.9rem",
            }}
          >
            {id}
          </pre>
          <p style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>
            You can copy this ID and paste it into PlanetScale&apos;s{" "}
            <code>Device</code> table as <code>deviceId</code>.
          </p>
        </>
      ) : (
        <p style={{ color: "#b91c1c" }}>
          Could not read deviceId. Make sure JavaScript and localStorage are
          enabled.
        </p>
      )}
    </main>
  );
}
