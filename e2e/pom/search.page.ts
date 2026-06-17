import { expect, type Locator } from "@playwright/test";
import { BasePage } from "./base.page";
import { parseFirstNumber, waitForSearchParams } from "../support/helpers";

const SEARCH_PATH = "/recherche-application";
const STATUS_LABELS: Record<string, string> = {
  under_construction: "En construction",
  to_validate: "A valider",
  poc: "POC (Preuve de concept)",
  in_production_mvp: "MVP en production",
  in_production: "En production",
  in_production_decommissioning: "À décommissionner",
  decommissioned: "Décommissionné",
  deleted: "Supprimé",
};

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
  private searchInput = () =>
    this.sidebar().getByTestId("application-filter-label");

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
    await this.openAccordion("sidebar-accordion-general", this.searchInput());
    await this.searchInput().fill(value);
    await expect(this.searchInput()).toHaveValue(value);
  }

  async expectSearchApplied(value: string): Promise<void> {
    await waitForSearchParams(
      this.page,
      (params) => params.get("search") === value,
    );
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
    const checkbox = this.statusCheckbox(status);
    await this.openAccordion("sidebar-accordion-status", checkbox);
    if (!(await checkbox.isChecked())) {
      await this.statusCheckboxLabel(status).click();
    }
    await expect(checkbox).toBeChecked();
    await waitForSearchParams(this.page, (p) =>
      (p.get("currentStatus__in") ?? "").split(",").includes(status),
    );
  }

  private statusCheckbox(status: string): Locator {
    return this.sidebar()
      .getByTestId("status-filter")
      .getByRole("checkbox", {
        name: STATUS_LABELS[status] ?? status,
        exact: true,
      });
  }

  private statusCheckboxLabel(status: string): Locator {
    return this.sidebar()
      .getByTestId("status-filter")
      .locator(`label[for="status-option-${status}"]`);
  }

  async filterByOrganization(value: string): Promise<void> {
    const input = this.sidebar().getByTestId("organization-filter-input");
    await this.openAccordion("sidebar-accordion-organization", input);
    await input.fill(value);
    await waitForSearchParams(this.page, (p) =>
      (p.get("organization") ?? "").includes(value),
    );
  }

  // --- Filtres résiduels (CSF) : tous reflétés dans l'URL (assertions déterministes) ---

  /** Filtre Qualité : borne IQ minimum puis maximum → params `iqGte` / `iqLte`. */
  async filterByQualityRange(min: number, max: number): Promise<void> {
    const minInput = this.byTestId("quality-filter-min");
    await this.openAccordion("sidebar-accordion-quality", minInput);
    await minInput.fill(String(min));
    await waitForSearchParams(this.page, (p) => p.get("iqGte") === String(min));
    await this.byTestId("quality-filter-max").fill(String(max));
    await waitForSearchParams(this.page, (p) => p.get("iqLte") === String(max));
  }

  // Les `DsfrCheckbox`/`DsfrCheckboxSet` n'exposent pas leur `data-testid` dans le DOM (contrairement
  // aux `DsfrInput`/`DsfrSelect`) → on cible ces cases par rôle/nom accessible, encapsulé dans le POM.

  // Cases DSFR : l'<input> est masqué et piloté par v-model (clic intercepté) → on clique le <label>
  // interactif, ciblé par son texte et encapsulé ici (cf. méthodologie POM, comme search/user-profile).

  /**
   * Filtre « Sans statut » : la case est **cochée par défaut** (`currentStatus__isNull` vaut `true`,
   * valeur par défaut omise de l'URL) ; la décocher pose `currentStatus__isNull=false` dans l'URL.
   */
  async toggleWithoutStatus(): Promise<void> {
    const label = this.sidebar()
      .locator("label")
      .filter({ hasText: "Sans statut" });
    await this.openAccordion("sidebar-accordion-status", label);
    await label.click();
    await waitForSearchParams(
      this.page,
      (p) => p.get("currentStatus__isNull") === "false",
    );
  }

  /** Filtre « Sans hébergement » → param `missingHosting`. */
  async filterMissingHosting(): Promise<void> {
    const label = this.sidebar()
      .locator("label")
      .filter({ hasText: "Sans hébergement" });
    await this.openAccordion("sidebar-accordion-hosting", label);
    await label.click();
    await waitForSearchParams(
      this.page,
      (p) => p.get("missingHosting") === "true",
    );
  }

  /** Filtre Priorité de redémarrage : coche une priorité (ex. `R0`) → param `priorityRestart`. */
  async filterByPriorityRestart(value: string): Promise<void> {
    const label = this.sidebar()
      .locator("label")
      .filter({ hasText: new RegExp(`^${value}\\b`) });
    await this.openAccordion("sidebar-accordion-general", label);
    await label.click();
    await waitForSearchParams(this.page, (p) =>
      (p.get("priorityRestart") ?? "").includes(value),
    );
  }

  /**
   * Filtre Conformité : positionne un critère (ex. `rgaa`) sur « Présent » ou « Absent » →
   * params `compliancePresent__in` / `complianceAbsent__in`.
   */
  async setComplianceState(
    criterion: string,
    state: "present" | "absent",
  ): Promise<void> {
    const select = this.byTestId(`compliance-option-${criterion}`);
    await this.openAccordion("sidebar-accordion-compliance", select);
    await select.selectOption(state);
    const param =
      state === "present" ? "compliancePresent__in" : "complianceAbsent__in";
    await waitForSearchParams(this.page, (p) =>
      (p.get(param) ?? "").split(",").includes(criterion),
    );
  }

  /** Filtre Email acteur → param `actorEmail`. */
  async filterByActorEmail(email: string): Promise<void> {
    const input = this.byTestId("actor-email-filter-input");
    await this.openAccordion("sidebar-accordion-organization", input);
    await input.fill(email);
    await waitForSearchParams(this.page, (p) => p.get("actorEmail") === email);
  }

  /** Sélectionne une option spéciale du filtre acteur (`missingMoa` / `missingMoe`). */
  async selectActorOption(value: "missingMoa" | "missingMoe"): Promise<void> {
    const select = this.byTestId("actor-filter-select");
    await this.openAccordion("sidebar-accordion-organization", select);
    await select.selectOption(value);
    await waitForSearchParams(this.page, (p) => p.get(value) === "true");
  }

  /** Filtre Source de données → param `dataSourceName`. */
  async filterByDataSource(name: string): Promise<void> {
    const input = this.byTestId("application-filter-data-source-name");
    await this.openAccordion("sidebar-accordion-donnees", input);
    await input.fill(name);
    await waitForSearchParams(
      this.page,
      (p) => p.get("dataSourceName") === name,
    );
  }

  /** Filtre Lien externe → param `link`. */
  async filterByExternalLink(link: string): Promise<void> {
    const input = this.byTestId("application-filter-link");
    await this.openAccordion("sidebar-accordion-general", input);
    await input.fill(link);
    await waitForSearchParams(this.page, (p) => p.get("link") === link);
  }

  // --- Filtres résiduels data-dépendants (compléments) ---

  private optionValues(testId: string): Promise<string[]> {
    return this.byTestId(testId)
      .locator("option")
      .evaluateAll((opts) => opts.map((o) => (o as HTMLOptionElement).value));
  }

  /** Valeurs réelles du select « type d'acteur » (hors « Tous » / MOA / MOE), après chargement async. */
  async actorTypeOptionValues(): Promise<string[]> {
    const select = this.byTestId("actor-filter-select");
    await this.openAccordion("sidebar-accordion-organization", select);
    const real = (vals: string[]) =>
      vals.filter((v) => v && v !== "missingMoa" && v !== "missingMoe");
    await expect
      .poll(
        async () => real(await this.optionValues("actor-filter-select")).length,
        {
          timeout: 8000,
        },
      )
      .toBeGreaterThan(0)
      .catch(() => {});
    return real(await this.optionValues("actor-filter-select"));
  }

  /** Filtre par un type d'acteur (valeur d'option) → param `actorType`. */
  async filterByActorType(optionValue: string): Promise<void> {
    const select = this.byTestId("actor-filter-select");
    await this.openAccordion("sidebar-accordion-organization", select);
    await select.selectOption(optionValue);
    await waitForSearchParams(this.page, (p) => !!p.get("actorType"));
  }

  /** Valeurs réelles du select « fournisseur d'hébergement » (hors « Tous »), après chargement async. */
  async hostingProviderOptionValues(): Promise<string[]> {
    const select = this.byTestId("hosting-provider-select");
    await this.openAccordion("sidebar-accordion-hosting", select);
    await expect
      .poll(
        async () =>
          (await this.optionValues("hosting-provider-select")).filter(Boolean)
            .length,
        { timeout: 8000 },
      )
      .toBeGreaterThan(0)
      .catch(() => {});
    return (await this.optionValues("hosting-provider-select")).filter(Boolean);
  }

  /** Filtre par fournisseur d'hébergement → param `hostingProvider`. */
  async filterByHostingProvider(value: string): Promise<void> {
    const select = this.byTestId("hosting-provider-select");
    await this.openAccordion("sidebar-accordion-hosting", select);
    await select.selectOption(value);
    await waitForSearchParams(
      this.page,
      (p) => p.get("hostingProvider") === value,
    );
  }

  /** Filtre par tag (autocomplete) → param `tag`. */
  async filterByTag(tagName: string): Promise<void> {
    const tagSearch = this.byTestId("search-tags");
    await this.openAccordion("sidebar-accordion-general", tagSearch);
    await tagSearch.getByRole("combobox").fill(tagName);
    await this.page
      .getByRole("listbox", { name: "Tags proposés" })
      .getByRole("option")
      .filter({ hasNotText: "Aucun résultat" })
      .first()
      .click();
    await waitForSearchParams(this.page, (p) => !!p.get("tag"));
  }

  /** Filtre par direction de métier (suggestion) → param `businessDivisionId`. */
  async filterByBusinessDivision(label: string): Promise<void> {
    const input = this.byTestId("business-division-suggestions-input");
    await this.openAccordion("sidebar-accordion-organization", input);
    await input.locator("input").fill(label);
    const list = this.sidebar().getByTestId("suggestions-list");
    await expect(list).toBeVisible();
    await list.locator('[data-testid^="suggestion-item-"]').first().click();
    await waitForSearchParams(this.page, (p) => !!p.get("businessDivisionId"));
  }

  /** Filtre par relation : choisit une application cible (suggestion) → param `relationAppId`. */
  async filterByRelationTarget(query: string): Promise<void> {
    const input = this.byTestId("relation-suggestions-input");
    await this.openAccordion("sidebar-accordion-relations", input);
    await input.locator("input").fill(query);
    const list = this.sidebar().getByTestId("suggestions-list");
    await expect(list).toBeVisible();
    await list.locator('[data-testid^="suggestion-item-"]').first().click();
    await waitForSearchParams(this.page, (p) => !!p.get("relationAppId"));
  }

  /** Replie puis ré-affiche la sidebar des filtres via son bouton de bascule. */
  async toggleSidebarTwice(): Promise<void> {
    const initiallyVisible = await this.sidebar().isVisible();
    await this.byTestId("sidebar-toggle").click();
    await expect(this.sidebar()).toBeVisible({ visible: !initiallyVisible });
    await this.byTestId("sidebar-toggle").click();
    await expect(this.sidebar()).toBeVisible({ visible: initiallyVisible });
  }

  /** Vérifie qu'un paramètre d'URL a été retiré (ex. bascule présent → absent). */
  expectParamAbsent(...names: string[]): void {
    const params = new URL(this.page.url()).searchParams;
    for (const name of names) {
      if (params.has(name))
        throw new Error(
          `Paramètre d'URL inattendu (devrait être absent): ${name}`,
        );
    }
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
