import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",
    specPattern: "cypress/e2e/**/*.cy.{js,ts}",
    fixturesFolder: "cypress/fixtures",
    supportFile: "cypress/support/e2e.{js,ts}",
    chromeWebSecurity: false,
  },
  component: {
    devServer: {
      framework: "vue",
      bundler: "vite",
    },
  },
});
