import { cleanup, render, screen } from "@testing-library/vue";
import AppLoader from "./AppLoader.vue";

describe("AppLoader — restitution aux lecteurs d'écran (RGAA 7.5)", () => {
  afterEach(cleanup);

  it("expose une zone de statut avec un texte de chargement par défaut", () => {
    render(AppLoader);
    expect(screen.getByRole("status")).toHaveTextContent("Chargement…");
  });

  it("accepte un texte de chargement personnalisé", () => {
    render(AppLoader, { props: { label: "Chargement du graphique…" } });
    expect(screen.getByRole("status")).toHaveTextContent("Chargement du graphique…");
  });

  it("masque l'icône animée aux technologies d'assistance", () => {
    render(AppLoader);
    expect(screen.getByRole("status").querySelector("svg, [class*='ri-loader']")).toHaveAttribute("aria-hidden", "true");
  });

  it("conserve le data-testid fourni par le parent", () => {
    render(AppLoader, { attrs: { "data-testid": "actor-loader" } });
    expect(screen.getByTestId("actor-loader")).toHaveAttribute("role", "status");
  });
});
