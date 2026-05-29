import { ImageResponse } from "next/og";

export const alt = "GHA Workflow Security Linter";
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
          background: "linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)",
          color: "#f8fafc",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
          padding: "64px",
          width: "100%",
        }}
      >
        <div style={{ fontSize: 28, opacity: 0.85 }}>GHA Workflow Security Linter</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 72, fontWeight: 700 }}>GHA Workflow Analyzer</div>
          <div style={{ fontSize: 34, maxWidth: 900, opacity: 0.92 }}>
            Browser-based tools for CI, config, and infrastructure files
          </div>
        </div>
      </div>
    ),
    size,
  );
}
