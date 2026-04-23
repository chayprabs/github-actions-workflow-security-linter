import { describe, expect, it } from "vitest";

import {
  buildAnalyzerFaqStructuredData,
  buildAnalyzerWebApplicationStructuredData,
  serializeJsonLd,
} from "@/features/actions-analyzer/lib/tool-structured-data";

describe("tool structured data", () => {
  it("builds a valid WebApplication JSON-LD payload", () => {
    const structuredData = buildAnalyzerWebApplicationStructuredData();

    expect(structuredData["@type"]).toBe("WebApplication");
    expect(structuredData.url).toContain(
      "/tools/github-actions-workflow-analyzer",
    );
    expect(structuredData.featureList.length).toBeGreaterThan(3);
  });

  it("builds a valid FAQPage JSON-LD payload", () => {
    const structuredData = buildAnalyzerFaqStructuredData();

    expect(structuredData["@type"]).toBe("FAQPage");
    expect(structuredData.mainEntity.length).toBeGreaterThanOrEqual(6);
    expect(structuredData.mainEntity[0]).toMatchObject({
      "@type": "Question",
      acceptedAnswer: {
        "@type": "Answer",
      },
    });
  });

  it("serializes JSON-LD safely for script injection", () => {
    const serialized = serializeJsonLd({
      test: "<script>",
    });

    expect(() => JSON.parse(serialized)).not.toThrow();
    expect(serialized).not.toContain("<script>");
  });
});
