const baseUrl = process.env.SMOKE_BASE_URL;

if (!baseUrl) {
  console.error("SMOKE_BASE_URL is required.");
  process.exit(1);
}

const routes = ["/", "/privacy", "/terms", "/robots.txt", "/sitemap.xml"];

const origin = new URL(baseUrl).origin;

for (const route of routes) {
  const response = await fetch(new URL(route, baseUrl));

  if (!response.ok) {
    console.error(`Failed ${route}: ${response.status}`);
    process.exit(1);
  }

  const body = await response.text();

  if (route.endsWith(".xml") && !body.includes(origin)) {
    console.error(`Sitemap does not include origin ${origin}`);
    process.exit(1);
  }

  console.log(`OK ${route}`);
}

const legacyRedirect = await fetch(
  new URL("/tools/github-actions-workflow-analyzer", baseUrl),
  { redirect: "manual" },
);

if (![301, 302, 307, 308].includes(legacyRedirect.status)) {
  console.error(`Legacy tool route did not redirect: ${legacyRedirect.status}`);
  process.exit(1);
}

console.log("OK legacy tool redirect");
console.log(`Smoke checks passed for ${origin}`);
