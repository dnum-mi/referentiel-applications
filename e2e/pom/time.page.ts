import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

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
}
