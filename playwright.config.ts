import { devices, defineConfig } from "@playwright/test";

export default defineConfig({
  timeout: 60000,
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        headless: false, // Cloudflare blocks headless mode almost immediately
        viewport: { width: 1280, height: 720 },
        launchOptions: {
          args: [
            "--disable-blink-features=AutomationControlled", // Strips navigator.webdriver = true
            "--no-sandbox",
            "--disable-setuid-sandbox",
          ],
        },
      },
    },
  ],
})