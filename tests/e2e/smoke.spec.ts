import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

const homePath = "/";
const uploadFixturePath = join(
  process.cwd(),
  "src/features/actions-analyzer/fixtures/golden/unpinned-third-party.yml",
);

async function installClipboardMock(page: Page) {
  await page.addInitScript(() => {
    const copiedTexts: string[] = [];

    Object.defineProperty(window, "__ghaCopiedTexts", {
      configurable: true,
      value: copiedTexts,
      writable: false,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        readText: async () => copiedTexts.at(-1) ?? "",
        writeText: async (text: string) => {
          copiedTexts.push(text);
        },
      },
    });
  });
}

function getVisibleInputPanel(page: Page) {
  return page.locator('[data-testid="input-panel"]:visible').first();
}

test("home, privacy, and terms pages load", async ({ page }) => {
  await page.goto(`${homePath}?sample=risky-pull-request-target`);
  await expect(page.getByTestId("seo-intro-bar")).toBeVisible();
  await expect(page.getByTestId("analyzer-page")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Import from GitHub/i }),
  ).toBeVisible();

  await page.goto("/privacy");
  await expect(
    page.getByTestId("privacy-toolbar").getByRole("heading", {
      name: /Privacy Policy/i,
    }),
  ).toBeVisible();

  await page.goto("/terms");
  await expect(
    page.getByTestId("terms-toolbar").getByRole("heading", {
      name: /Terms & Conditions/i,
    }),
  ).toBeVisible();
});

test("legacy tool route redirects to home", async ({ page }) => {
  await page.goto("/tools/github-actions-workflow-analyzer");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("analyzer-page")).toBeVisible();
});

test("risky sample analysis shows findings, editor jump, and PR comment copy", async ({
  page,
}) => {
  await installClipboardMock(page);
  await page.goto(`${homePath}?sample=risky-pull-request-target`);
  const inputPanel = getVisibleInputPanel(page);

  await expect(inputPanel.getByTestId("workflow-path-input")).toHaveValue(
    /\.github\/workflows\/pr-target-risky\.yml/i,
  );
  await expect(inputPanel.getByTestId("workflow-code-editor")).toBeVisible();

  await page.getByRole("button", { name: /^Analyze$/i }).click();

  await expect(page.getByTestId("results-score")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("results-finding-list")).toContainText(
    /GHA103/i,
    {
      timeout: 30_000,
    },
  );
  await expect(page.getByTestId("results-finding-list")).toContainText(
    /GHA104/i,
    {
      timeout: 30_000,
    },
  );

  await page
    .getByTestId("results-finding-list")
    .getByRole("button", { name: /GHA104/i })
    .click();
  await expect(inputPanel.locator(".cm-gha-active-finding-line")).toBeVisible();

  await page.getByRole("button", { name: /Copy PR comment/i }).click();

  const copiedText = await page.evaluate(() => {
    return (
      (
        window as Window & {
          __ghaCopiedTexts?: string[] | undefined;
        }
      ).__ghaCopiedTexts?.at(-1) ?? null
    );
  });

  expect(copiedText).toContain("## Workflow Security Review");
  expect(copiedText).toContain("GHA103");
});

test("uploading a workflow file analyzes locally and surfaces findings", async ({
  page,
}) => {
  await page.goto(`${homePath}?sample=risky-pull-request-target`);
  const inputPanel = getVisibleInputPanel(page);

  await inputPanel
    .getByTestId("workflow-file-upload")
    .setInputFiles(uploadFixturePath);
  await expect(
    inputPanel.getByText(/unpinned-third-party\.yml/i),
  ).toBeVisible();

  await page.getByRole("button", { name: /^Analyze$/i }).click();

  await expect(page.getByTestId("results-score")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("results-finding-list")).toContainText(/GHA/i, {
    timeout: 30_000,
  });
});

test.describe("mobile workspace", () => {
  test.use({
    viewport: {
      height: 844,
      width: 390,
    },
  });

  test("shows mobile tabs and avoids horizontal overflow", async ({ page }) => {
    await page.goto(`${homePath}?sample=risky-pull-request-target`);

    await expect(page.getByTestId("analyzer-mobile-tabs")).toBeVisible();
    await expect(page.getByRole("tab", { name: /^Input$/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /^Findings$/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /^Report$/i })).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(() => {
      return (
        document.documentElement.scrollWidth > window.innerWidth + 1 ||
        document.body.scrollWidth > window.innerWidth + 1
      );
    });

    expect(hasHorizontalOverflow).toBe(false);
  });
});
