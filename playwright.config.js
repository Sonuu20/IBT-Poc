// @ts-check
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",

  fullyParallel: true,

  forbidOnly: !!process.env.CI,

  retries: process.env.CI ? 2 : 0,

  workers: process.env.CI ? 1 : undefined,

  reporter: "html",

  use: {
    baseURL: "http://localhost:5173",

    headless: true,

    trace: "on-first-retry",

    // 🔥 IMPORTANT for performance stability
    launchOptions: {
      args: [
        "--disable-web-security",
        "--disable-features=IsolateOrigins,site-per-process",
        "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding",
        "--disable-backgrounding-occluded-windows",
      ],
    },

    viewport: { width: 1280, height: 720 },

    actionTimeout: 10000,
    navigationTimeout: 15000,
  },

  projects: [
    //  PRIMARY (use this for all performance tests)
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    //  Secondary (optional sanity checks only)
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },

    // {
    //   name: "webkit",
    //   use: { ...devices["Desktop Safari"] },
    // },
  ],

  // 🔥 MUST for Vite
  webServer: {
    command: "npm run dev",
    port: 5173,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
