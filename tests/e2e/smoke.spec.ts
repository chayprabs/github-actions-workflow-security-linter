import { expect, test } from "@playwright/test";

test("home page and analyzer placeholder load", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: /Developer tools that catch production mistakes before they ship\./i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: /GitHub Actions Workflow Security and Lint Analyzer/i,
    }),
  ).toBeVisible();

  await page.goto("/tools/github-actions-workflow-analyzer");
  await expect(
    page.getByRole("heading", {
      name: /GitHub Actions Workflow Security and Lint Analyzer/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Load risky sample/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Load risky sample/i }).click();
  await expect(page.getByLabel(/Workflow YAML/i)).toHaveValue(
    /pull_request_target/i,
  );
  await page.getByRole("button", { name: /Analyze/i }).click();
  await expect(page.getByText(/No findings detected/i)).toBeVisible();

  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: /Privacy/i })).toBeVisible();
  await expect(
    page.getByText(
      /Pasted content for the GitHub Actions analyzer is not uploaded/i,
    ),
  ).toBeVisible();
});
