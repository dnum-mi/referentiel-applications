describe("Applications Search Page", () => {
  beforeEach(() => {
    // Mock user API response
    cy.intercept("GET", "/api/v2/users/me", { fixture: "adminUserInfo.json" }).as("rolesCall");

    // Mock Applications API response
    cy.intercept("GET", "/api/v2/applications", { fixture: "applications.json" }).as("applicationsCall");
    cy.intercept("GET", "/api/v2/actorTypes", { fixture: "actorTypes.json" }).as("actorTypesCall");
    cy.intercept("GET", "/api/v2/sites", { fixture: "sites.json" }).as("sitesCall");
    cy.intercept("GET", "/api/v2/hosting-options", { fixture: "hostingOptions.json" }).as("hostingCall");
    cy.intercept("GET", "/api/v2/organizations", { fixture: "organizations.json" }).as("organizationsCall");

    // Visit the applications search page before each test
    cy.visit("/recherche-application");

    cy.get("a").get(".fr-btn").contains("Se connecter").click();

    // Wait for the API call to complete
    cy.get("#username").type("user");
    cy.get("#password").type("password");
    cy.get('button[type="submit"]').click();

    cy.wait("@rolesCall");

    cy.wait("@applicationsCall");
    cy.wait("@actorTypesCall");
    cy.wait("@sitesCall");
    cy.wait("@applicationsSearchCall");
    cy.wait("@hostingCall");
    cy.wait("@organizationsCall");
  });

  it("should display applications in the table", () => {
    cy.get("table").should("exist");
    cy.get("table tbody tr").should("have.length.greaterThan", 0);
  });

  it("should show the searched app", () => {
    cy.get("button").contains("Général").click();

    cy.get("#basic-v-6-input").type("Bergnaum - Oberbrunner");

    cy.get("table tbody tr").should("have.length", 1);
    cy.get("table tbody tr").first().should("contain", "Bergnaum - Oberbrunner");
  });

  it("should searched non existant app", () => {
    cy.get("button").contains("Général").click();

    cy.get("#basic-v-6-input").type("Non Existant App");

    cy.get("table tbody tr").should("have.length", 0);
    cy.get("table tbody tr").should("not.exist");
  });

  it("should search by tag", () => {
    cy.get("button").contains("Général").click();

    cy.get("#basic-v-7-input").type("MONITORING");

    cy.get("table tbody tr").should("have.length", 2);
    cy.get("table tbody tr").first().should("contain", "Dibbert - Pollich");
    cy.get("table tbody tr").last().should("contain", "Pagac and Sons");
  });

  it("should search by tag not used", () => {
    cy.get("button").contains("Général").click();

    cy.get("#basic-v-7-input").type("NOT_USED_TAG");

    cy.get("table tbody tr").should("have.length", 0);
    cy.get("table tbody tr").should("not.exist");
  });

  it("should search by link", () => {
    cy.get("button").contains("Général").click();

    cy.get("#basic-v-8-input").type("https://example.com");

    cy.get("table tbody tr").should("have.length", 1);
    cy.get("table tbody tr").first().should("contain", "Dibbert - Pollich");
  });

  it("should search by link not used", () => {
    cy.get("button").contains("Général").click();

    cy.get("#basic-v-8-input").type("https://notused.com");

    cy.get("table tbody tr").should("have.length", 0);
    cy.get("table tbody tr").should("not.exist");
  });

  it("should search by actor type", () => {
    cy.get("button").contains("Organisation & Acteurs").click();

    cy.get("#select-v-10").select("Autre");

    cy.get("table tbody tr").should("have.length", 1);
    cy.get("table tbody tr").first().should("contain", "Bergnaum - Oberbrunner");
  });

  it("should search by actor type not used", () => {
    cy.get("button").contains("Organisation & Acteurs").click();

    cy.get("#select-v-10").select("Tierce Maintenance Applicative");

    cy.get("table tbody tr").should("have.length", 0);
    cy.get("table tbody tr").should("not.exist");
  });

  it("should search by organization", () => {
    cy.get("button").contains("Organisation & Acteurs").click();

    cy.get("#basic-v-11-input").type("Test Organization");

    cy.get("table tbody tr").should("have.length", 1);
    cy.get("table tbody tr").first().should("contain", "Bergnaum - Oberbrunner");
  });

  it("should search by organization not used", () => {
    cy.get("button").contains("Organisation & Acteurs").click();

    cy.get("#basic-v-11-input").type("Non Existant Organization");

    cy.get("table tbody tr").should("have.length", 0);
    cy.get("table tbody tr").should("not.exist");
  });

  it("should search by restart priority", () => {
    cy.get("button").contains("Hébergement").click();

    // cy.get('#select-v-12').select("Haut");
    cy.get("input[type='checkbox'][value='R0']").check();

    cy.get("table tbody tr").should("have.length", 2);
    cy.get("table tbody tr").first().should("contain", "Bergnaum - Oberbrunner");
    cy.get("table tbody tr").last().should("contain", "Pagac and Sons");
  });

  it("Should search by hosting option", () => {
    cy.get("button").contains("Hébergement").click();

    cy.get("#basic-v-13-input").type("New Reagan");

    cy.get("table tbody tr").should("have.length", 1);
    cy.get("table tbody tr").first().should("contain", "Marvin - Weissnat");
  });

  it("should search by hosting option not used", () => {
    cy.get("button").contains("Hébergement").click();

    cy.get("#basic-v-13-input").type("Non Existant Hosting");

    cy.get("table tbody tr").should("have.length", 0);
    cy.get("table tbody tr").should("not.exist");
  });

  it("should search with specific IQ between 3 and 5 ", () => {
    cy.get("button").contains("Qualité").click();

    cy.get("#basic-v-15-input").type("3");
    cy.get("#basic-v-16-input").clear();
    cy.get("#basic-v-16-input").type("5");

    cy.get("table tbody tr").should("have.length", 3);
    cy.get("table tbody tr").first().should("contain", "Bergnaum - Oberbrunner");
    cy.get("table tbody tr").last().should("contain", "Pagac and Sons");
  });

  it("should search with specific IQ higher than 6", () => {
    cy.get("button").contains("Qualité").click();

    cy.get("#basic-v-15-input").type("6");
    cy.get("#basic-v-16-input").clear();
    cy.get("#basic-v-16-input").type("100");

    cy.get("table tbody tr").should("have.length", 1);
    cy.get("table tbody tr").first().should("contain", "Dibbert - Pollich");
  });

  it.skip("should filter by status", () => {
    cy.get("button").contains("Statut").click();

    // cy.get('input[type="checkbox"][value="in_production"]').check();
    cy.get("label").contains("En production").click();

    cy.get("table tbody tr").should("have.length", 2);
    cy.get("table tbody tr").first().should("contain", "Bergnaum - Oberbrunner");
    cy.get("table tbody tr").last().should("contain", "Pagac and Sons");
  });
});
