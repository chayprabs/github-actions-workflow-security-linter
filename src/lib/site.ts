import type { Route } from "next";

import { featuredTool } from "@/content/tools";

const homeRoute = "/" as Route;
const privacyRoute = "/privacy" as Route;

export const siteConfig = {
  name: "Authos",
  tagline: "Browser-based tools for CI, config, and infrastructure files",
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
