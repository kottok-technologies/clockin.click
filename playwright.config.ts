import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DEMO_MODE: "true",
      LOCAL_KIOSK_MOCK: "true",
      LOCAL_PEOPLE_MOCK: "true",
      NEXT_PUBLIC_DEMO_MODE: "true",
      NEXT_PUBLIC_SCHOOL_NAME: "Clockin.Click Demo School",
      NEXTAUTH_SECRET: "clockinclick-playwright-only-secret",
      NEXTAUTH_URL: "http://127.0.0.1:3000",
    },
  },
});
