describe("Home page", () => {
  beforeEach(() => {
    // Mock user API response
    cy.intercept("GET", "/api/v2/users/me", { fixture: "adminUserInfo.json" }).as("rolesCall");

    // Visit the home page before each test
    cy.visit("/");
  });

  it("should display the home page", () => {
    cy.get("h1").should("contain", "Le référentiel des applications");
  });

  it("should display login button", () => {
    // cy.get('a').get('fr-btn').contains('Se connecter').should('exist');
    cy.get("a").get(".fr-btn").contains("Se connecter").should("exist");
  });

  it("should'nt display navbar", () => {
    cy.get("nav").should("not.exist");
  });

  it("should login and display navbar", () => {
    // Click on the login button
    cy.get("a").get(".fr-btn").contains("Se connecter").click();

    // Wait for the API call to complete
    cy.get("#username").type("user");
    cy.get("#password").type("password");
    cy.get('button[type="submit"]').click();

    // Wait for the login redirect
    cy.wait("@rolesCall");

    // Check if the navbar is displayed
    cy.get(".fr-nav__list").should("exist");
    cy.get(".fr-nav__list").should("contain", "Applications");
  });
});
