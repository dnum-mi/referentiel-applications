import { expect } from "@playwright/test";
import { BasePage } from "./base.page";
import { waitForSearchParams } from "../support/helpers";

/**
 * Page Object — Diagramme Time (`/time`, `TimePage`) : nuage de points D3 de maturité TIME (dette
 * technique). Dataviz : on asserte la présence du SVG (rôle `img`) ou l'état vide, jamais le rendu
 * interne D3 (cercles, axes).
 */
export class TimePage extends BasePage {
  private title = () => this.byTestId("time-title");
  private chartSection = () => this.byTestId("technical-debt-chart-section");
  // La sidebar de /time est le composant partagé : son testid propre est `sidebar-filter`.
  private filters = () => this.byTestId("sidebar-filter");
  // L'aria-label du SVG est posé dynamiquement par D3 (« …maturites TIME »).
  private scatter = () => this.page.getByRole("img", { name: /maturit/i });
  private empty = () => this.byTestId("technical-debt-empty");
  // Sélecteur de campagne dette IT (millésime). Le `data-testid` du DsfrSelect porte le <select>.
  private millesimeSelector = () => this.byTestId("time-millesime");
  private millesimeSelect = () => this.byTestId("time-millesime-select");

  async open(): Promise<void> {
    await this.goto("/time");
    await expect(this.title()).toBeVisible();
  }

  /** La page est chargée : titre + section du graphique. */
  async expectLoaded(): Promise<void> {
    await expect(this.title()).toBeVisible();
    await expect(this.chartSection()).toBeVisible();
  }

  /** Le nuage de points s'affiche, sinon l'état vide (le loader s'est résolu). */
  async expectChartOrEmpty(): Promise<void> {
    await expect(this.scatter().or(this.empty())).toBeVisible();
  }

  /** La sidebar de filtres est présente sur la page Time. */
  async expectFiltersPresent(): Promise<void> {
    await expect(this.filters()).toBeVisible();
  }

  /** Le sélecteur de campagne dette IT (millésime) est présent. */
  async expectMillesimeSelectorPresent(): Promise<void> {
    await expect(this.millesimeSelector()).toBeVisible();
  }

  /** Millésime actuellement sélectionné dans le sélecteur de campagne. */
  async selectedMillesime(): Promise<string> {
    return this.millesimeSelect().inputValue();
  }

  /** Millésimes proposés par le sélecteur (valeurs numériques, hors option vide). */
  async availableMillesimes(): Promise<string[]> {
    const values = await this.millesimeSelect()
      .locator("option")
      .evaluateAll((options) =>
        options.map((o) => (o as HTMLOptionElement).value),
      );
    return values.filter((v) => v !== "");
  }

  /** Sélectionne un millésime et attend sa propagation dans l'URL (`millesime`). */
  async selectMillesime(year: string): Promise<void> {
    await this.millesimeSelect().selectOption(year);
    await waitForSearchParams(
      this.page,
      (params) => params.get("millesime") === year,
    );
  }
}
