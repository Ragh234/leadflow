import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end walkthrough of every flow in the brief. Expects the API on :8000 and the
 * web app on :3000 (see the README); global-setup reseeds the database first so the run
 * is repeatable. Produces docs/screenshots/*.png and docs/demo.webm.
 */
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 90_000,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    // The follow-up rules depend on the viewer's zone; pin it so screenshots are stable.
    timezoneId: "Asia/Kolkata",
    locale: "en-IN",
    viewport: { width: 1280, height: 800 },
    video: { mode: "on", size: { width: 1280, height: 800 } },
    trace: "retain-on-failure",
    launchOptions: { slowMo: Number(process.env.E2E_SLOWMO ?? 150) },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } }],
});
