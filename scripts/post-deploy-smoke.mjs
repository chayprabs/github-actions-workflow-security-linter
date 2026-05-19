const baseUrl = process.env.SMOKE_BASE_URL;

if (!baseUrl) {
  console.error("SMOKE_BASE_URL is required.");
  process.exit(1);
}

const routes = [
  "/",
  "/privacy",
  "/tools/github-actions-workflow-analyzer",
  "/robots.txt",
  "/sitemap.xml",
];

const origin = new URL(baseUrl).origin;

for (const route of routes) {
  const response = await fetch(new URL(route, baseUrl));

  if (!response.ok) {
    console.error(`Failed ${route}: ${response.status}`);
    process.exit(1);
  }

  const body = await response.text();

  if (route.endsWith(".xml") || route.endsWith(".txt")) {
    if (!body.includes(origin) && route === "/sitemap.xml") {
      console.error(`Sitemap does not include origin ${origin}`);
      process.exit(1);
    }
  }

  console.log(`OK ${route}`);
}

console.log(`Smoke checks passed for ${origin}`);
