import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 60_000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3100",
    viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "NODE_ENV=test node tests/php-server.mjs",
    url: "http://127.0.0.1:3100/pdf/healthz.php",
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
