describe("Flow principal", () => {
  it("devrait afficher la page d’accueil", () => {
    cy.visit("/");
    cy.get("h1").should("contain", "Le référentiel des applications");
  });
});
