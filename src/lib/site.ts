import type { Route } from "next";

import { featuredTool } from "@/content/tools";

const homeRoute = "/" as Route;
const privacyRoute = "/privacy" as Route;
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
  tagline: "Browser-based tools for CI, config, and infrastructure files",
  url: siteUrl,
  navigation: [
    { href: homeRoute, label: "Tools" },
    {
      href: featuredTool.href,
      label: "GitHub Actions Analyzer",
    },
    { href: privacyRoute, label: "Privacy" },
  ],
  primaryTool: {
    href: featuredTool.href,
    navLabel: "GitHub Actions Analyzer",
    name: featuredTool.name,
  },
  privacy: {
    href: privacyRoute,
    title: "Privacy",
  },
} as const;
