describe("Flow principal", () => {
  beforeEach(() => {
    // Mocker toutes les requêtes vers /api
    cy.intercept("GET", "/api/**", { fixture: "example.json" }).as("apiCall");
  });

  it("devrait afficher la page d’accueil", () => {
    cy.visit("/");
    cy.get("h1").contains("Le référentiel des applications");
  });
});
