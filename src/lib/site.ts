import type { Route } from "next";

const homeRoute = "/" as Route;
const privacyRoute = "/privacy" as Route;
const termsRoute = "/terms" as Route;
const fallbackSiteUrl = "http://127.0.0.1:3000";

function resolveSiteUrl(input: string | undefined) {
  if (!input) {
    return fallbackSiteUrl;
  }

  try {
    return new URL(input.trim()).toString().replace(/\/+$/u, "");
  } catch {
    return fallbackSiteUrl;
  }
}

const siteUrl = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

export const siteConfig = {
  name: "GHA Workflow Analyzer",
  shortName: "GHA Workflow Analyzer",
  tagline:
    "Browser-local GitHub Actions workflow security and lint analyzer",
  description:
    "Paste or upload GitHub Actions workflow YAML to find syntax errors, risky permissions, unsafe triggers, unpinned actions, and CI reliability problems. Runs locally in your browser with no login.",
  url: siteUrl,
  githubRepo:
    "https://github.com/chayprabs/github-actions-workflow-security-linter",
  twitterUrl: "https://x.com/chayprabs",
  personalWebsiteUrl: "https://www.chaitanyaprabuddha.com",
  seoIntro: {
    primary:
      "Analyze GitHub Actions workflow YAML for security, permissions, supply-chain, and reliability issues before merge.",
    secondary:
      "Paste, upload, or import public workflows in your browser—no login required and pasted content is not uploaded to a server.",
  },
  primaryTool: {
    href: homeRoute,
    name: "GitHub Actions Workflow Security and Lint Analyzer",
  },
  privacy: {
    href: privacyRoute,
    title: "Privacy Policy",
  },
  terms: {
    href: termsRoute,
    title: "Terms & Conditions",
  },
} as const;
