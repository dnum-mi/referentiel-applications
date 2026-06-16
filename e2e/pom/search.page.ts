import { expect, type Locator } from "@playwright/test";
import { BasePage } from "./base.page";
import { parseFirstNumber, waitForSearchParams } from "../support/helpers";

const SEARCH_PATH = "/recherche-application";

/** Page Object — Catalogue & recherche (`/recherche-application`). */
export class SearchPage extends BasePage {
  // --- Locators encapsulés ---
  private title = () => this.byTestId("application-search-title");
  private table = () => this.byTestId("application-table");
  private cardView = () => this.byTestId("application-card-view");
  private averageIqTag = () => this.byTestId("application-average-iq");
  private sidebar = () => this.byTestId("sidebar-filter");
  private totalCounter = () => this.byTestId("sidebar-total-count");
  private resetButton = () => this.byTestId("sidebar-reset-filters-button");
  private myAppsToggle = () => this.byTestId("my-apps-filter-toggle");
  private subscribedToggle = () =>
    this.byTestId("my-apps-filter-toggle-subscribed");
  private customizeColumnsButton = () =>
    this.byTestId("customize-columns-button");
  private columnsDialog = () => this.byTestId("customize-columns-dialog");
  // La recherche texte se fait via la barre full-text en haut de la page (param `q`),
  // qui a remplacé l'ancien champ « Nom de l'application » du sidebar.
  private searchInput = () =>
    this.byTestId("application-fulltext-search-wrapper").locator("input");

  // --- Navigation ---
  async open(): Promise<void> {
    await this.goto(SEARCH_PATH);
    await expect(this.title()).toBeVisible();
    await expect(this.table().or(this.cardView())).toBeVisible();
  }

  /** Recharge la page et attend la liste (pour vérifier la persistance des filtres). */
  async reload(): Promise<void> {
    await this.page.reload();
    await expect(this.title()).toBeVisible();
  }

  /** Accès non authentifié : doit rediriger vers la page de connexion Keycloak. */
  async gotoExpectingLogin(): Promise<void> {
    await this.goto(SEARCH_PATH);
    await this.page.waitForURL(/\/realms\/.+\/protocol\/openid-connect\/auth/i);
  }

  // --- Lectures sémantiques ---
  async rowCount(): Promise<number> {
    return this.table().locator("tbody tr").count();
  }

  async totalCount(): Promise<number> {
    return parseFirstNumber((await this.totalCounter().innerText()).trim());
  }

  async expectListLoaded(): Promise<void> {
    await expect
      .poll(() => this.rowCount(), { timeout: 15000 })
      .toBeGreaterThan(0);
    await expect
      .poll(() => this.totalCount(), { timeout: 15000 })
      .toBeGreaterThan(0);
  }

  async expectAverageIqVisible(): Promise<void> {
    await expect(this.averageIqTag()).toBeVisible();
  }

  async expectResultsVisible(): Promise<void> {
    await expect(this.table().or(this.cardView())).toBeVisible();
  }

  /** Libellé de la première application listée (sert de donnée au protocole côté UI). */
  async firstRowLabel(): Promise<string> {
    const link = this.table().locator("tbody tr a").first();
    await expect(link).toBeVisible();
    return (await link.innerText()).trim();
  }

  // --- Actions de filtrage ---
  async searchByLabel(value: string): Promise<void> {
    const input = this.searchInput();
    await expect(input).toBeVisible();
    await input.fill(value);
    await expect(input).toHaveValue(value);
  }

  async expectSearchApplied(value: string): Promise<void> {
    await waitForSearchParams(this.page, (params) => params.get("q") === value);
  }

  async resetFilters(): Promise<void> {
    await expect(this.resetButton()).toBeVisible();
    await this.resetButton().click();
    await waitForSearchParams(this.page, (params) => params.toString() === "");
  }

  async toggleMyApps(): Promise<void> {
    await expect(this.myAppsToggle()).toBeVisible();
    await this.myAppsToggle().click();
  }

  /** Active le filtre « Mes applications » et vérifie sa propagation dans l'URL (CAT-10). */
  async toggleMyAppsAndExpectApplied(): Promise<void> {
    await expect(this.myAppsToggle()).toBeVisible();
    await this.myAppsToggle().click();
    await waitForSearchParams(
      this.page,
      (params) => params.get("myApplications") === "true",
    );
  }

  /** Active le filtre « Mes abonnements » et vérifie sa propagation dans l'URL (CAT-16). */
  async toggleSubscribedAppsAndExpectApplied(): Promise<void> {
    await expect(this.subscribedToggle()).toBeVisible();
    await this.subscribedToggle().click();
    await waitForSearchParams(
      this.page,
      (params) => params.get("subscribersEmail") === "true",
    );
  }

  // --- Personnalisation des colonnes (CAT-17 : colonnes avancées MOA/MOE/Plateforme/Fournisseur) ---
  async openColumnCustomization(): Promise<void> {
    await this.customizeColumnsButton().click();
    await expect(this.columnsDialog()).toBeVisible();
  }

  async closeColumnCustomization(): Promise<void> {
    await this.byTestId("close-dialog-button").click();
    await expect(this.columnsDialog()).toBeHidden();
  }

  /** Une colonne est proposée dans la boîte de personnalisation (droit ColumnRead). */
  async expectColumnOptionAvailable(label: string): Promise<void> {
    await expect(
      this.columnsDialog().getByRole("checkbox", { name: label, exact: true }),
    ).toBeVisible();
  }

  /** Active une colonne via sa case dans la boîte de personnalisation. */
  async enableColumn(label: string): Promise<void> {
    // Case DSFR : l'<input> est masqué et piloté par v-model → on clique le <label> interactif.
    const box = this.columnsDialog().getByRole("checkbox", {
      name: label,
      exact: true,
    });
    if (!(await box.isChecked())) {
      await this.columnsDialog().getByText(label, { exact: true }).click();
      await expect(box).toBeChecked();
    }
  }

  /** L'en-tête de colonne est visible dans le tableau. */
  async expectColumnVisible(header: string): Promise<void> {
    await expect(
      this.page.getByRole("columnheader", { name: header, exact: true }),
    ).toBeVisible();
  }

  // --- Tri ---
  async sortByName(): Promise<void> {
    await this.page.getByRole("columnheader", { name: /Nom/i }).click();
    await waitForSearchParams(this.page, (params) =>
      ["asc", "desc"].includes(params.get("order") ?? "asc"),
    );
  }

  async sortByIq(): Promise<void> {
    await this.page.getByRole("columnheader", { name: /^IQ$/i }).click();
    await waitForSearchParams(
      this.page,
      (params) => params.get("sortBy") === "quality",
    );
  }

  currentSortOrder(): string {
    return new URL(this.page.url()).searchParams.get("order") ?? "asc";
  }

  async expectSortOrderChangedFrom(previous: string): Promise<void> {
    await waitForSearchParams(
      this.page,
      (params) => (params.get("order") ?? "asc") !== previous,
    );
  }

  // --- Pagination ---
  async setPageSize(value: string): Promise<void> {
    await this.table().locator(".p-paginator-rpp-dropdown").click();
    await this.page
      .locator(".p-select-overlay")
      .getByRole("option", { name: value, exact: true })
      .click();
    await waitForSearchParams(
      this.page,
      (params) => params.get("pageSize") === value,
    );
  }

  async goToNextPage(): Promise<void> {
    const next = this.table().locator(".p-paginator-next");
    await expect(next).toBeEnabled();
    await next.click();
    await waitForSearchParams(
      this.page,
      (params) => params.get("page") === "1",
    );
  }

  async goToPrevPage(): Promise<void> {
    const prev = this.table().locator(".p-paginator-prev");
    await expect(prev).toBeEnabled();
    await prev.click();
    await waitForSearchParams(
      this.page,
      (params) => (params.get("page") ?? "0") === "0",
    );
  }

  // --- Navigation vers la fiche ---
  async openFirstApplication(): Promise<void> {
    const link = this.table().locator("tbody tr:first-child a").first();
    await expect(link).toBeVisible();
    await Promise.all([
      this.page.waitForURL((url) =>
        /^\/applications\/[^/]+/.test(url.pathname),
      ),
      link.click(),
    ]);
  }

  // --- Filtres additionnels ---
  async filterByStatus(status: string): Promise<void> {
    const checkbox = this.byTestId(`status-option-${status}`);
    await this.openAccordion("sidebar-accordion-status", checkbox);
    await checkbox.check();
    await expect(checkbox).toBeChecked();
    await waitForSearchParams(this.page, (p) =>
      (p.get("currentStatus__in") ?? "").split(",").includes(status),
    );
  }

  async filterByOrganization(value: string): Promise<void> {
    const input = this.sidebar().getByTestId("organization-filter-input");
    await this.openAccordion("sidebar-accordion-organization", input);
    await input.fill(value);
    await waitForSearchParams(this.page, (p) =>
      (p.get("organization") ?? "").includes(value),
    );
  }

  /** Vérifie que tous les paramètres de filtre attendus coexistent dans l'URL. */
  expectParamsPresent(...names: string[]): void {
    const params = new URL(this.page.url()).searchParams;
    for (const name of names) {
      if (!params.has(name))
        throw new Error(`Paramètre d'URL manquant: ${name}`);
    }
  }

  // --- Affichage responsive (CAT-11 : pas de toggle, c'est la largeur d'écran qui décide) ---
  async expectTableViewOnDesktop(): Promise<void> {
    await this.page.setViewportSize({ width: 1280, height: 900 });
    await expect(this.table()).toBeVisible();
  }

  async expectCardViewOnMobile(): Promise<void> {
    await this.page.setViewportSize({ width: 375, height: 800 });
    await expect(this.byTestId("application-card-container")).toBeVisible();
  }

  // --- État vide (CAT-14) ---
  async expectEmptyState(): Promise<void> {
    // D'abord attendre que le filtre ramène le total à 0 (sinon la table montre encore l'ancien jeu).
    await expect.poll(() => this.totalCount(), { timeout: 15000 }).toBe(0);
    await expect(this.table()).toContainText(/Aucune donnée ne correspond/i);
  }

  // --- Signalement global (SIG-01) ---
  async submitGlobalReport(description: string): Promise<void> {
    await this.byTestId("report-missing-app").click();
    await expect(this.byTestId("report-modal")).toBeVisible();
    await this.byTestId("report-description").fill(description);
    await this.byTestId("report-submit-btn").click();
    await this.expectToaster(/Merci pour votre signalement/i);
  }

  // --- Export Excel (CAT-15) : renvoie le téléchargement déclenché ---
  async exportExcel() {
    const [download] = await Promise.all([
      this.page.waitForEvent("download"),
      this.byTestId("application-export-btn").click(),
    ]);
    return download;
  }

  // --- Interne ---
  private async openAccordion(
    accordionTestId: string,
    content: Locator,
  ): Promise<void> {
    if (!(await this.sidebar().isVisible())) {
      await this.byTestId("sidebar-toggle").click();
      await expect(this.sidebar()).toBeVisible();
    }
    if (await content.isVisible()) return;

    const trigger = this.sidebar()
      .getByTestId(accordionTestId)
      .getByRole("button")
      .first();
    await expect(trigger).toBeVisible();
    const panelId = await trigger.getAttribute("aria-controls");
    if (panelId) {
      const panel = this.page.locator(`#${panelId}`);
      if (!(await panel.isVisible())) {
        await trigger.click();
        await expect(panel).toBeVisible();
      }
    } else {
      await trigger.click();
    }
    await expect(content).toBeVisible();
  }
}
