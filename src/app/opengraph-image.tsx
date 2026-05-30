import { ImageResponse } from "next/og";

import { siteConfig } from "@/lib/site";

export const alt = siteConfig.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#ffffff",
        color: "#0f172a",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        justifyContent: "center",
        padding: 80,
        width: "100%",
      }}
    >
      <div style={{ fontSize: 28, opacity: 0.75 }}>
        Browser-local CI security
      </div>
      <div style={{ fontSize: 64, fontWeight: 700, marginTop: 16 }}>
        {siteConfig.shortName}
      </div>
      <div
        style={{
          fontSize: 26,
          lineHeight: 1.4,
          marginTop: 24,
          maxWidth: 900,
          textAlign: "center",
        }}
      >
        {siteConfig.tagline}
      </div>
    </div>,
    size,
  );
}
