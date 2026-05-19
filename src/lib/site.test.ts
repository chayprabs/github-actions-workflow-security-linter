import { afterEach, describe, expect, it, vi } from "vitest";

describe("site URL resolution", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("falls back when NEXT_PUBLIC_SITE_URL is missing or invalid", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");

    const { siteConfig: emptyConfig } = await import("@/lib/site");
    expect(emptyConfig.url).toBe("https://authos.local");

    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "not-a-valid-url");
    vi.resetModules();

    const { siteConfig: invalidConfig } = await import("@/lib/site");
    expect(invalidConfig.url).toBe("https://authos.local");
  });

  it("normalizes a valid public site URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com/");
    vi.resetModules();

    const { siteConfig } = await import("@/lib/site");
    expect(siteConfig.url).toBe("https://example.com");
  });
});
