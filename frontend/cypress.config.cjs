// frontend/cypress.config.cjs
const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",
    specPattern: "cypress/e2e/**/*.cy.{js,ts}",
    fixturesFolder: "cypress/fixtures",
    supportFile: "cypress/support/e2e.{js,ts}",
    chromeWebSecurity: false,
    setupNodeEvents(on, config) {
      // ici vos hooks (intercepts, reports…)
    },
  },
});
