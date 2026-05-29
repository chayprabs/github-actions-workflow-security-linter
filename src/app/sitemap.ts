import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      changeFrequency: "weekly",
      priority: 1,
      url: new URL("/", siteConfig.url).toString(),
    },
    {
      changeFrequency: "monthly",
      priority: 0.4,
      url: new URL(siteConfig.privacy.href, siteConfig.url).toString(),
    },
    {
      changeFrequency: "monthly",
      priority: 0.4,
      url: new URL(siteConfig.terms.href, siteConfig.url).toString(),
    },
  ];
}
