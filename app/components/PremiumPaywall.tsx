// app/components/PremiumPaywall.tsx
"use client";


type PaywallReason = "equivalentSearch" | "leaflet" | "pets" | "generics" | "triage";

interface PremiumPaywallProps {
  visible: boolean;
  reason?: PaywallReason;
  onClose: () => void;
  onUpgrade: () => void;
}

function reasonTitle(reason?: PaywallReason): string {
  switch (reason) {
    case "equivalentSearch":
      return "International medicine search limit reached";
    case "leaflet":
      return "Medicine leaflet limit reached";
    case "pets":
      return "Pet medicines are a mediceaGO feature";
    case "generics":
      return "Generic search is a mediceaGO feature";
    case "triage":
      return "Symptom triage is a mediceaGO feature";
    default:
      return "Upgrade to mediceaGO";
  }
}

function reasonBody(reason?: PaywallReason): string {
  switch (reason) {
    case "equivalentSearch":
      return "You have reached your free monthly limit of international medicine searches (2 per month). Upgrade to mediceaGO to unlock unlimited searches worldwide.";
    case "leaflet":
      return "You have reached your free monthly limit of detailed medicine leaflets (2 per month). Upgrade to mediceaGO to read unlimited leaflets for any medicine.";
    case "pets":
      return "Pet medicine equivalence is part of mediceaGO. Upgrade to unlock pet medicine search without limits.";
    case "generics":
      return "Generic medicine search is part of mediceaGO. Upgrade to search unlimited generics across countries.";
    case "triage":
      return "Symptom triage is part of mediceaGO. Upgrade to get structured guidance for symptoms in many countries.";
    default:
      return "Upgrade to mediceaGO to unlock unlimited searches, detailed leaflets, and advanced features like generics, pet medicines and symptom triage.";
  }
}

export default function PremiumPaywall(props: PremiumPaywallProps) {
  const { visible, reason, onClose, onUpgrade } = props;

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          padding: "20px 22px",
          maxWidth: 420,
          width: "90%",
          boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
        }}
      >
        <div style={{ marginBottom: 10, fontWeight: 700, fontSize: "1.1rem" }}>
          {reasonTitle(reason)}
        </div>

        <p style={{ fontSize: "0.95rem", lineHeight: 1.5, marginBottom: 12 }}>
          {reasonBody(reason)}
        </p>

        <ul
          style={{
            fontSize: "0.9rem",
            margin: "0 0 12px 16px",
            padding: 0,
            listStyle: "disc",
          }}
        >
          <li>2 international searches + 2 leaflets / month with free medicea</li>
          <li>Unlimited international searches with mediceaGO</li>
          <li>Unlimited medicine leaflets with mediceaGO</li>
          <li>Access to mediceaGO advanced features as they launch</li>
        </ul>

        <div style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: 12 }}>
          mediceaPLUS (your personal medical record) and mediceaPRO (for clinics and
          hospitals) will be separate, higher-level services built on top of mediceaGO.
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              borderRadius: 9999,
              border: "1px solid #e5e7eb",
              padding: "6px 12px",
              background: "#f9fafb",
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            Maybe later
          </button>
          <button
            type="button"
            onClick={onUpgrade}
            style={{
              borderRadius: 9999,
              border: "none",
              padding: "6px 16px",
              background:
                "linear-gradient(135deg, #0b74de 0%, #4f9dff 45%, #0e8c7c 100%)",
              color: "#fff",
              fontSize: "0.95rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Upgrade to mediceaGO
          </button>
        </div>
      </div>
    </div>
  );
}
