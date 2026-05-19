import { ImageResponse } from "next/og";

export const alt = "GitHub Actions Workflow Security and Lint Analyzer";
export const size = {
  height: 630,
  width: 1200,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "flex-start",
          background: "linear-gradient(135deg, #111827 0%, #2563eb 55%, #0f766e 100%)",
          color: "#f8fafc",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
          padding: "64px",
          width: "100%",
        }}
      >
        <div style={{ fontSize: 28, opacity: 0.85 }}>Authos Analyzer</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.1 }}>
            GitHub Actions Workflow Security and Lint Analyzer
          </div>
          <div style={{ fontSize: 30, maxWidth: 980, opacity: 0.92 }}>
            Local workflow review for permissions, triggers, supply chain, and CI
            reliability.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
