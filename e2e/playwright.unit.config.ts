import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./unit",
  reporter: "list",
  forbidOnly: !!process.env.CI,
});
