import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

const toolPath = "/tools/github-actions-workflow-analyzer";
const uploadFixturePath = join(
  process.cwd(),
  "src/features/actions-analyzer/fixtures/golden/unpinned-third-party.yml",
);

async function installClipboardMock(page: Page) {
  await page.addInitScript(() => {
    const copiedTexts: string[] = [];

    Object.defineProperty(window, "__authosCopiedTexts", {
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

test("home, tool, and privacy pages load", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: /Developer tools that catch production mistakes before they ship\./i,
    }),
  ).toBeVisible();
  await expect(
    page.getByTestId("home-hero").getByRole("link", {
      name: /Open GitHub Actions Analyzer/i,
    }),
  ).toBeVisible();

  await page.goto(toolPath);
  await expect(
    page.getByTestId("analyzer-hero").getByRole("heading", {
      name: /GitHub Actions Workflow Security and Lint Analyzer/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Import from GitHub/i }),
  ).toBeVisible();

  await page.goto("/privacy");
  await expect(
    page.getByTestId("privacy-toolbar").getByRole("heading", {
      name: /^Privacy$/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByTestId("privacy-alert").getByRole("link", {
      name: /GitHub Actions Workflow Security and Lint Analyzer/i,
    }),
  ).toBeVisible();
});

test("risky sample analysis shows findings, editor jump, and PR comment copy", async ({
  page,
}) => {
  await installClipboardMock(page);
  await page.goto(toolPath);
  const inputPanel = getVisibleInputPanel(page);

  await page.getByTestId("hero-load-risky-sample").click();
  await expect(inputPanel.getByTestId("workflow-path-input")).toHaveValue(
    /\.github\/workflows\/pr-target-risky\.yml/i,
  );
  await expect(inputPanel.getByTestId("workflow-code-editor")).toBeVisible();
  await expect(inputPanel.getByTestId("workflow-yaml-editor")).toBeVisible();

  await page.getByRole("button", { name: /^Analyze$/i }).click();

  await expect(page.getByTestId("results-finding-list")).toContainText(/GHA103/i);
  await expect(page.getByTestId("results-finding-list")).toContainText(/GHA104/i);

  await page
    .getByTestId("results-finding-list")
    .getByRole("button", { name: /GHA104/i })
    .click();
  await expect(inputPanel.locator(".cm-authos-active-finding-line")).toBeVisible();

  await page.getByRole("button", { name: /Copy PR comment/i }).click();

  const copiedText = await page.evaluate(() => {
    return (
      (
        window as Window & {
          __authosCopiedTexts?: string[] | undefined;
        }
      ).__authosCopiedTexts?.at(-1) ?? null
    );
  });

  expect(copiedText).toContain("## Authos Review");
  expect(copiedText).toContain("GHA103");
});

test("uploading a workflow file analyzes locally and surfaces findings", async ({
  page,
}) => {
  await page.goto(toolPath);
  const inputPanel = getVisibleInputPanel(page);

  await inputPanel
    .getByTestId("workflow-file-upload")
    .setInputFiles(uploadFixturePath);
  await expect(inputPanel.getByText(/unpinned-third-party\.yml/i)).toBeVisible();

  await page.getByRole("button", { name: /^Analyze$/i }).click();

  await expect(page.getByText(/GHA200/i)).toBeVisible();
  await expect(page.getByText(/GHA202/i)).toBeVisible();
});

test.describe("mobile workspace", () => {
  test.use({
    viewport: {
      height: 844,
      width: 390,
    },
  });

  test("shows mobile tabs and avoids horizontal overflow", async ({ page }) => {
    await page.goto(toolPath);

    await expect(page.getByTestId("analyzer-mobile-tabs")).toBeVisible();
    await expect(
      page.getByRole("tab", {
        name: /^Input$/i,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("tab", {
        name: /^Findings$/i,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("tab", {
        name: /^Report$/i,
      }),
    ).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(() => {
      return (
        document.documentElement.scrollWidth > window.innerWidth + 1 ||
        document.body.scrollWidth > window.innerWidth + 1
      );
    });

    expect(hasHorizontalOverflow).toBe(false);
  });
});
