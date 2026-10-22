import { expect } from "@playwright/test";
import { BasePage } from "./base.page";
import { SearchPage } from "./search.page";
import { waitForSearchParams } from "../support/helpers";

interface TimeSearchResponse {
  technicalDebtPoints: {
    id: string;
    label: string;
    shortName?: string | null;
  }[];
}

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
  // Le nom accessible du SVG vient du résumé associé par aria-labelledby.
  private scatter = () =>
    this.chartSection().getByRole("img", {
      name: "Diagramme TIME",
      exact: true,
    });
  private empty = () => this.byTestId("technical-debt-empty");
  // Sélecteur de campagne dette IT (millésime), dans l'accordéon « Portefeuille » de la sidebar.
  // Le `data-testid` du DsfrSelect porte le <select>.
  private portfolioAccordion = () =>
    this.byTestId("sidebar-accordion-portfolio");
  private millesimeSelector = () => this.byTestId("time-millesime");
  private millesimeSelect = () => this.byTestId("time-millesime-select");

  /** Déploie l'accordéon « Portefeuille » si le sélecteur de campagne n'est pas déjà visible. */
  private async ensureCampaignVisible(): Promise<void> {
    if (await this.millesimeSelector().isVisible()) return;
    await this.portfolioAccordion().getByRole("button").first().click();
    await expect(this.millesimeSelector()).toBeVisible();
  }

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
    if (await this.scatter().isVisible()) {
      // D3 pose le viewBox lors du dessin : un SVG monté mais non dessiné ne suffit pas.
      await expect(this.scatter()).toHaveAttribute(
        "viewBox",
        /^0 0 \d+(?:\.\d+)? \d+(?:\.\d+)?$/,
      );
    } else {
      await expect(this.empty()).toHaveText(
        "Aucune donnée TIME disponible pour vos applications autorisées.",
      );
    }
  }

  /** Attend la réponse portant les filtres demandés, puis les données réellement rendues. */
  private async expectSearchApplied(
    action: () => Promise<void>,
    expectedParams: Record<string, string>,
  ): Promise<void> {
    const [response] = await Promise.all([
      this.page.waitForResponse((res) => {
        const url = new URL(res.url());
        return (
          res.request().method() === "GET" &&
          url.pathname === "/api/v2/applications" &&
          url.searchParams.get("pageSize") === "0" &&
          Object.entries(expectedParams).every(
            ([key, value]) => url.searchParams.get(key) === value,
          )
        );
      }),
      action(),
    ]);
    expect(response.ok(), `Chargement TIME : HTTP ${response.status()}`).toBe(
      true,
    );
    const body = (await response.json()) as TimeSearchResponse;
    expect(Array.isArray(body.technicalDebtPoints)).toBe(true);

    if (body.technicalDebtPoints.length === 0) {
      await expect(this.empty()).toBeVisible();
      await expect(this.scatter()).toHaveCount(0);
    } else {
      await expect(this.scatter()).toBeVisible();
      await expect(this.empty()).toHaveCount(0);
      const labels = body.technicalDebtPoints.map((point) =>
        point.shortName && point.shortName !== point.label
          ? `${point.label} (${point.shortName})`
          : point.label,
      );
      await expect(
        this.byTestId("technical-debt-transcription").locator("tbody th"),
      ).toHaveText(labels);
    }
    await this.expectChartOrEmpty();
  }

  /** Réutilise les contrôles de la sidebar, puis vérifie la recherche IQ et son résultat TIME. */
  async filterByQualityRange(min: number, max: number): Promise<void> {
    await this.expectSearchApplied(
      () => new SearchPage(this.page).filterByQualityRange(min, max),
      { iqGte: String(min), iqLte: String(max) },
    );
  }

  /** La sidebar de filtres est présente sur la page Time. */
  async expectFiltersPresent(): Promise<void> {
    await expect(this.filters()).toBeVisible();
  }

  /** Le sélecteur de campagne dette IT (millésime) est présent (accordéon « Portefeuille »). */
  async expectMillesimeSelectorPresent(): Promise<void> {
    await this.ensureCampaignVisible();
    await expect(this.millesimeSelector()).toBeVisible();
  }

  /** Millésime actuellement sélectionné dans le sélecteur de campagne. */
  async selectedMillesime(): Promise<string> {
    await this.ensureCampaignVisible();
    return this.millesimeSelect().inputValue();
  }

  /** Millésimes proposés par le sélecteur (valeurs numériques, hors option vide). */
  async availableMillesimes(): Promise<string[]> {
    await this.ensureCampaignVisible();
    const values = await this.millesimeSelect()
      .locator("option")
      .evaluateAll((options) =>
        options.map((o) => (o as HTMLOptionElement).value),
      );
    return values.filter((v) => v !== "");
  }

  /** Sélectionne un millésime et attend sa propagation dans l'URL (`millesime`). */
  async selectMillesime(year: string): Promise<void> {
    await this.ensureCampaignVisible();
    await this.expectSearchApplied(
      async () => {
        await this.millesimeSelect().selectOption(year);
        await waitForSearchParams(
          this.page,
          (params) => params.get("millesime") === year,
        );
      },
      { millesime: year },
    );
  }
}
