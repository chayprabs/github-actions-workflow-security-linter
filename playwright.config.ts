import { defineConfig, devices } from "@playwright/test";

const isCi = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:3105",
    trace: "on-first-retry",
  },
  projects: isCi
    ? [
        {
          name: "chromium",
          use: { ...devices["Desktop Chrome"] },
        },
      ]
    : [
        {
          name: "chromium",
          use: { ...devices["Desktop Chrome"] },
        },
        {
          name: "firefox",
          use: { ...devices["Desktop Firefox"] },
        },
        {
          name: "webkit",
          use: { ...devices["Desktop Safari"] },
        },
      ],
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3105",
    reuseExistingServer: !isCi,
    timeout: 120_000,
    url: "http://127.0.0.1:3105",
  },
});
