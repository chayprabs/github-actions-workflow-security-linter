import type { Metadata } from "next";

import { AnalyzerPage } from "@/features/actions-analyzer/components/analyzer-page";
import {
  analyzerToolDescription,
  analyzerToolTitle,
} from "@/features/actions-analyzer/content/landing-content";
import {
  buildAnalyzerFaqStructuredData,
  buildAnalyzerWebApplicationStructuredData,
  serializeJsonLd,
} from "@/features/actions-analyzer/lib/tool-structured-data";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: {
    absolute: analyzerToolTitle,
  },
  description: analyzerToolDescription,
  alternates: {
    canonical: siteConfig.primaryTool.href,
  },
  openGraph: {
    description: analyzerToolDescription,
    siteName: siteConfig.name,
    title: analyzerToolTitle,
    type: "website",
    url: siteConfig.primaryTool.href,
  },
};

export default function GitHubActionsWorkflowAnalyzerPage() {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(buildAnalyzerWebApplicationStructuredData()),
        }}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(buildAnalyzerFaqStructuredData()),
        }}
        type="application/ld+json"
      />
      <AnalyzerPage />
    </>
  );
}
