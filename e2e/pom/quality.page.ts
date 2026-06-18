import { expect, type Locator } from "@playwright/test";
import { BasePage } from "./base.page";

/**
 * Page Object — Qualité générale (`/qualite-generale`).
 *
 * La page agrège 4 widgets : statistiques globales (sans bascule) et 3 graphiques dataviz
 * (« Répartition par IQ », « Applications par mois », « Évolution de l'IQ moyen »). Pour les
 * graphiques, canvas et tableau coexistent dans le DOM en `v-show` : on asserte via la bascule
 * sémantique « Voir le tableau / Voir le graphique », jamais sur le rendu interne du canvas.
 */
export class QualityPage extends BasePage {
  private title = () => this.byTestId("quality-page-title");

  // Statistiques globales (pas de bascule)
  private globalStatsData = () => this.byTestId("global-stats-data");
  private firstGlobalStat = () => this.byTestId("global-stats-item-0");

  // Widget « Répartition des applications par IQ »
  private iqRepartToggle = () =>
    this.byTestId("applications-iq-chart-toggle-view");
  private iqRepartCanvas = () => this.byTestId("applications-iq-chart-canvas");
  private iqRepartTable = () => this.byTestId("applications-iq-chart-table");

  // Widget « Applications par mois »
  private appsToggle = () => this.byTestId("applications-chart-toggle-view");
  private appsCanvas = () => this.byTestId("applications-chart-canvas");
  private appsTable = () => this.byTestId("applications-chart-table");

  // Widget « Évolution de l'IQ moyen »
  private trendToggle = () => this.byTestId("iq-chart-toggle-view");
  private trendCanvas = () => this.byTestId("iq-chart-canvas");
  private trendTable = () => this.byTestId("iq-chart-table");
  private trendNoData = () => this.byTestId("iq-chart-no-data");
  private trendError = () => this.byTestId("iq-chart-error");
  private trendStart = () => this.byTestId("iq-chart-start-date");
  private trendEnd = () => this.byTestId("iq-chart-end-date");
  private trendGroupBy = () => this.byTestId("iq-chart-groupby-select");

  async open(): Promise<void> {
    await this.goto("/qualite-generale");
    await expect(this.title()).toBeVisible();
  }

  /** Les 4 widgets sont rendus : stats globales chargées + les 3 graphiques exposent leur bascule. */
  async expectLoaded(): Promise<void> {
    await expect(this.title()).toBeVisible();
    await expect(this.globalStatsData()).toBeVisible();
    await expect(this.iqRepartToggle()).toBeVisible();
    await expect(this.appsToggle()).toBeVisible();
    await expect(this.trendToggle()).toBeVisible();
  }

  /** Le bloc de statistiques globales affiche au moins un indicateur. */
  async expectGlobalStatsVisible(): Promise<void> {
    await expect(this.globalStatsData()).toBeVisible();
    await expect(this.firstGlobalStat()).toBeVisible();
  }

  /**
   * Bascule générique graphique ↔ tableau d'un widget : graphique par défaut, le bouton montre le
   * tableau, puis re-bascule au graphique. Canvas/table sont pilotés par `v-show` (les deux dans le DOM).
   */
  private async expectChartTogglesView(
    toggle: Locator,
    canvas: Locator,
    table: Locator,
  ): Promise<void> {
    await expect(canvas).toBeVisible();
    await toggle.click();
    await expect(table).toBeVisible();
    await expect(canvas).toBeHidden();
    await toggle.click();
    await expect(canvas).toBeVisible();
    await expect(table).toBeHidden();
  }

  expectIqRepartitionTogglesView(): Promise<void> {
    return this.expectChartTogglesView(
      this.iqRepartToggle(),
      this.iqRepartCanvas(),
      this.iqRepartTable(),
    );
  }

  expectApplicationsPerMonthTogglesView(): Promise<void> {
    return this.expectChartTogglesView(
      this.appsToggle(),
      this.appsCanvas(),
      this.appsTable(),
    );
  }

  /**
   * Bascule de la frise « Évolution de l'IQ moyen ». La frise peut être vide selon la période par
   * défaut (canvas de taille nulle), donc on valide la bascule via le tableau `RefAppTable`, qui
   * reste rendu indépendamment des données.
   */
  async expectIqTrendTogglesView(): Promise<void> {
    await this.trendToggle().click();
    await expect(this.trendTable()).toBeVisible();
    await this.trendToggle().click();
    await expect(this.trendTable()).toBeHidden();
  }

  /**
   * Restreint la frise « Évolution de l'IQ moyen » à une période future : aucune donnée n'existe,
   * l'état vide dédié s'affiche. Démontre que les filtres de période déclenchent bien un refetch.
   */
  async expectIqTrendEmptyForFuturePeriod(): Promise<void> {
    await this.trendStart().fill("2099-01-01");
    await this.trendEnd().fill("2099-12-31");
    await expect(this.trendNoData()).toBeVisible();
  }

  /** Change le regroupement de la frise IQ moyen ; le widget refetch sans erreur. */
  async changeIqTrendGroupBy(value: "day" | "week" | "month"): Promise<void> {
    await this.trendGroupBy().selectOption(value);
    await expect(this.trendError()).toBeHidden();
    await expect(this.trendToggle()).toBeVisible();
  }
}
