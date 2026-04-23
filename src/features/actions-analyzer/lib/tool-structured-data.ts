import {
  analyzerCheckAreas,
  analyzerFaqItems,
  analyzerToolDescription,
  analyzerToolTitle,
} from "@/features/actions-analyzer/content/landing-content";
import { siteConfig } from "@/lib/site";

export function buildAnalyzerWebApplicationStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    applicationCategory: "DeveloperApplication",
    browserRequirements: "Requires JavaScript and a modern browser.",
    creator: {
      "@type": "Organization",
      name: siteConfig.name,
    },
    description: analyzerToolDescription,
    featureList: analyzerCheckAreas.map((area) => area.title),
    isAccessibleForFree: true,
    name: analyzerToolTitle,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    operatingSystem: "Any",
    url: `${siteConfig.url}${siteConfig.primaryTool.href}`,
  };
}

export function buildAnalyzerFaqStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: analyzerFaqItems.map((item) => ({
      "@type": "Question",
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
      name: item.question,
    })),
  };
}

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</gu, "\\u003c");
}
