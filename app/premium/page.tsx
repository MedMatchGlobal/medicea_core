// app/premium/page.tsx
"use client";

export default function PremiumPage() {
  return (
    <main
      style={{
        maxWidth: 720,
        margin: "2rem auto",
        padding: "1.5rem",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.75rem" }}>
        mediceaGO – coming soon
      </h1>
      <p style={{ marginBottom: "0.75rem", lineHeight: 1.5 }}>
        mediceaGO is the unlimited version of medicéa. It will unlock:
      </p>
      <ul style={{ marginLeft: "1.25rem", marginBottom: "0.75rem" }}>
        <li>Unlimited international medicine searches</li>
        <li>Unlimited detailed medicine leaflets</li>
        <li>Access to advanced features such as pet medicines, generics and triage</li>
      </ul>
      <p style={{ marginBottom: "0.75rem", lineHeight: 1.5 }}>
        medicea FREE will always give you 2 international searches + 2 leaflets per
        month. mediceaGO builds on top of that for people who need more frequent use.
      </p>
      <p style={{ marginTop: "1rem", fontSize: "0.9rem", color: "#6b7280" }}>
        mediceaPLUS (personal medical record) and mediceaPRO (for clinics and
        hospitals) will be launched as separate services on top of mediceaGO.
      </p>
    </main>
  );
}
