import { defineConfig, devices } from "@playwright/test";

const E2E_PORT = 3100;
const E2E_URL = `http://localhost:${String(E2E_PORT)}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: E2E_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run dev -- --port ${String(E2E_PORT)}`,
    env: {
      AI_MOCK: "1",
      PORT: String(E2E_PORT),
    },
    reuseExistingServer: !process.env.CI,
    url: E2E_URL,
  },
});
