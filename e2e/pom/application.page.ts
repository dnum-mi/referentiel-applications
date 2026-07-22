import { expect, type Locator } from "@playwright/test";
import { BasePage } from "./base.page";

/** Identifiants d'onglet de la fiche (= `tabId`, aussi segment d'URL). */
export type AppTab =
  | "tab-infos"
  | "tab-data"
  | "tab-links"
  | "tab-compliances"
  | "tab-actors"
  | "tab-relations"
  | "tab-statuses"
  | "tab-reports"
  | "tab-modifications"
  | "tab-quality";

/** Page Object — Fiche application (`/applications/:id/:tab?`). */
export class ApplicationPage extends BasePage {
  private currentId = "";

  private root = () => this.byTestId("application-profile");
  // Wrapper stable de l'onglet (DsfrTabContent), visible uniquement quand l'onglet est actif.
  // On ne cible PAS `application-tab-component-*` : ce composant est monté en lazy via
  // `<component :is>` et le data-testid n'atterrit pas toujours sur son nœud racine.
  private tabContent = (tab: AppTab) =>
    this.byTestId(`application-tab-content-${tab}`);

  // --- Navigation ---
  async open(id: string, tab?: AppTab): Promise<void> {
    this.currentId = id;
    await this.goto(`/applications/${id}${tab ? `/${tab}` : ""}`);
    await expect(this.root()).toBeVisible();
    if (tab) await this.expectTabActive(tab);
  }

  async openTab(tab: AppTab): Promise<void> {
    await this.goto(`/applications/${this.currentId}/${tab}`);
    await this.expectTabActive(tab);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.root()).toBeVisible();
  }

  async expectTabActive(tab: AppTab): Promise<void> {
    await expect(this.tabContent(tab)).toBeVisible();
    await expect.poll(() => new URL(this.page.url()).pathname).toContain(tab);
  }

  // Bouton d'onglet par son nom accessible : les onglets sans droits sont FILTRÉS du
  // rendu (`ApplicationOverview.onBeforeMount`), le bouton n'existe alors pas du tout.
  private tabButton = (title: string) =>
    this.page.getByRole("tab", { name: title });

  async expectTabButtonVisible(title: string): Promise<void> {
    await expect(this.tabButton(title)).toBeVisible();
  }

  async expectTabButtonAbsent(title: string): Promise<void> {
    await expect(this.tabButton(title)).toHaveCount(0);
  }

  // --- Tri dans les onglets ---

  /**
   * Clic sur un en-tête de colonne triable dans une table d'onglet, identifiée par son
   * `data-testid`. Attend que la table reste visible après le re-rendu (client-side ou lazy).
   */
  async sortTabColumn(tableTestId: string, headerName: string): Promise<void> {
    const table = this.byTestId(tableTestId);
    await expect(table).toBeVisible();
    await table
      .getByRole("columnheader", { name: headerName, exact: true })
      .click();
    await expect(table).toBeVisible();
  }

  /**
   * Tri dans l'onglet Acteurs : le wrapper `actor-tab` encapsule la table PrimeVue
   * (pas de `data-testid` standard sur la `<DataTable>` — cf. `data-test-id` avec tiret).
   * On localise le `columnheader` dans le scope du wrapper.
   */
  async sortActorColumn(headerName: string): Promise<void> {
    const wrapper = this.byTestId("actor-tab");
    await expect(wrapper).toBeVisible();
    await wrapper
      .getByRole("columnheader", { name: headerName, exact: true })
      .click();
    await expect(wrapper).toBeVisible();
  }

  /**
   * Tri dans l'onglet Modifications (lazy/server-side) : le clic déclenche un appel réseau.
   * On attend que le loader disparaisse (ou n'apparaisse pas) puis que la table soit visible.
   */
  async sortModificationsColumn(headerName: string): Promise<void> {
    const table = this.byTestId("modifications-table");
    await expect(table).toBeVisible();
    await table
      .getByRole("columnheader", { name: headerName, exact: true })
      .click();
    // Le loader peut apparaitre brievement, on attend la stabilisation de la table.
    await expect(table).toBeVisible({ timeout: 10000 });
  }

  // --- En-tête (titre + tags) ---
  // Seul le tag IQ est toujours rendu ; statut (`v-if statusDate`) et type (`v-if type`) sont
  // conditionnels selon les données → on ne les exige pas (robuste quel que soit le seed).
  async expectHeader(): Promise<void> {
    await expect(this.byTestId("application-title")).toBeVisible();
    await expect(this.byTestId("application-title")).not.toBeEmpty();
    await expect(this.byTestId("application-iq-tag")).toBeVisible();
  }

  // --- Onglets : vérifications sémantiques (table ou état vide, sans fuite de sélecteur) ---
  // `.first()` : certains onglets affichent à la fois un en-tête et un état vide (ex. acteurs) ;
  // on évite ainsi la violation du mode strict quand les deux nœuds coexistent.
  async expectActorsTabLoaded(): Promise<void> {
    await expect(
      this.byTestId("actor-tab").or(this.byTestId("actor-empty-state")).first(),
    ).toBeVisible();
  }

  async expectStatusesTabLoaded(): Promise<void> {
    await expect(
      this.byTestId("statuses-table")
        .or(this.byTestId("statuses-empty"))
        .first(),
    ).toBeVisible();
  }

  async expectCompliancesTabLoaded(): Promise<void> {
    await expect(
      this.byTestId("compliance-table")
        .or(this.byTestId("compliance-empty"))
        .first(),
    ).toBeVisible();
  }

  async expectLinksTabLoaded(): Promise<void> {
    await expect(
      this.byTestId("links-table").or(this.byTestId("links-empty")).first(),
    ).toBeVisible();
  }

  async expectQualityIndexVisible(): Promise<void> {
    await expect(this.byTestId("quality-index")).toBeVisible();
  }

  async expectRelationsWithTarget(): Promise<void> {
    await expect(this.byTestId("relations-table")).toBeVisible();
    await expect(this.byTestId("relation-target-link").first()).toBeVisible();
  }

  // --- Onglet Informations générales (FIC-02) ---
  async expectInfosTabLoaded(): Promise<void> {
    await expect(this.byTestId("informations-generales")).toBeVisible();
    await expect(this.byTestId("info-description")).toBeVisible();
  }

  // Le bouton d'édition est toujours rendu mais `:disabled` selon le droit d'écriture
  // (canEditBase = AppWrite OU AppWritePriority).
  /** Le bouton d'édition des infos est actif (droit d'écriture) — PRM-10. */
  async expectInfoEditAvailable(): Promise<void> {
    await expect(this.byTestId("info-edit-btn")).toBeEnabled();
  }

  /** Le bouton d'édition des infos est désactivé (Lecteur sans droit) — PRM-09. */
  async expectInfoEditDisabled(): Promise<void> {
    await expect(this.byTestId("informations-generales")).toBeVisible();
    await expect(this.byTestId("info-edit-btn")).toBeDisabled();
  }

  // --- Tags cliquables de l'onglet infos (FIC-21, #1967) ---
  // ATTENTION collision de `data-testid` : `info-tags` est AUSSI utilisé par
  // `TagSearchSelect.vue` (modale d'édition de la fiche ET sidebar de filtres de la page de
  // recherche). On scope donc TOUJOURS ce locator à l'intérieur du conteneur
  // `informations-generales` de l'onglet infos — jamais un `byTestId("info-tags")` global, qui
  // pourrait remonter un faux positif hors de cette vue (mode strict Playwright en plus).
  private infoTagLink(tagValue: string): Locator {
    // Correspondance exacte (regex ancrée) : un tag peut être préfixe d'un autre (cf. pattern
    // déjà utilisé pour les lignes email dans `admin.page.ts`).
    const escaped = tagValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return this.byTestId("informations-generales")
      .getByTestId("info-tags")
      .getByTestId("info-tag-link")
      .filter({ hasText: new RegExp(`^${escaped}$`) });
  }

  /**
   * Clique sur le tag `tagValue` de l'onglet infos et attend la navigation vers le catalogue
   * filtré par ce tag (`/recherche-application?tag=...`) — FIC-21.
   */
  async clickInfoTag(tagValue: string): Promise<void> {
    const link = this.infoTagLink(tagValue);
    await expect(link).toBeVisible();
    await Promise.all([
      this.page.waitForURL(/\/recherche-application\?/),
      link.click(),
    ]);
  }

  // --- Carte Dette technique sur l'onglet Infos (FIC-15, ticket #1900) ---
  /**
   * La carte dette technique affiche le libellé « Maîtrise des coûts » (renommé depuis
   * « Maturité des coûts ») et ne présente plus l'ancien libellé.
   */
  async expectCostContainmentLabel(): Promise<void> {
    const card = this.byTestId("info-technical-debt");
    await expect(card).toBeVisible();
    await expect(card.getByText("Maîtrise des coûts")).toBeVisible();
    await expect(card.getByText("Maturité des coûts")).toHaveCount(0);
  }

  /** Le badge « Maîtrise des coûts » affiche « Non notée » quand le score est `null` (FIC-16, #1900). */
  async expectCostContainmentNotRated(): Promise<void> {
    await expect(this.byTestId("costContainment-badge")).toContainText(
      "Non notée",
    );
  }

  // --- Axe RGAA, section dédiée en bas de l'onglet conformités (FIC-06) ---
  async expectRgaaSectionVisible(): Promise<void> {
    await expect(this.page.getByText(/Conformités RGAA/i)).toBeVisible();
    await expect(
      this.byTestId("rgaa-empty").or(this.byTestId("rgaa-add-btn")).first(),
    ).toBeVisible();
  }

  // --- Onglet Sources de données (FIC-09, DAT) ---
  async expectDataSourcesTabLoaded(): Promise<void> {
    await expect(this.byTestId("data-application-table")).toBeVisible();
  }

  /** Nombre de lignes de données dans l'onglet Sources de données. */
  dataRowCount(): Promise<number> {
    return this.byTestId("data-application-table").locator("tbody tr").count();
  }

  /** Ouvre le détail de la 1ʳᵉ donnée (clic sur le bouton de nom) et attend la page de détail (DAT). */
  async openFirstDataDetail(): Promise<void> {
    await this.byTestId("data-application-table")
      .locator("tbody")
      .getByRole("button")
      .first()
      .click();
    await expect(this.page).toHaveURL(/\/applications\/[^/]+\/data\/[^/]+/);
  }

  // --- Onglet Signalements de l'application (FIC-13) ---
  async expectReportsTabLoaded(): Promise<void> {
    await expect(this.byTestId("reports-table")).toBeVisible();
  }

  /** Soumet un signalement depuis l'onglet signalements de la fiche (SIG-02). */
  async submitReportFromApp(description: string): Promise<void> {
    await this.byTestId("reports-report-issue").click();
    await this.byTestId("report-issue-textarea").fill(description);
    await this.byTestId("report-issue-submit-btn").click();
    await this.expectToaster(/prise en compte|proposition/i);
  }

  // --- Onglet Modifications / historique (FIC-14, HIS-11) ---
  async expectModificationsTabLoaded(): Promise<void> {
    await expect(this.byTestId("modifications-table")).toBeVisible();
  }

  /** Nombre de boutons « Voir plus » de l'onglet Modifications (0 si aucune modification). */
  modificationsSeeMoreCount(): Promise<number> {
    return this.byTestId("modifications-see-more-button").count();
  }

  /** Ouvre le détail de la 1ʳᵉ modification depuis l'onglet et attend la page de détail (HIS-11). */
  async openFirstModificationDetail(): Promise<void> {
    await this.byTestId("modifications-see-more-button").first().click();
    await expect(this.page).toHaveURL(/\/metadatas\//);
  }

  // --- Abonnement (bouton sans data-testid → ciblé par nom accessible, encapsulé ici) ---
  private subscribeButton(): Locator {
    return this.root().getByRole("button", { name: /S'abonner|Abonné/i });
  }

  async isSubscribed(): Promise<boolean> {
    return /Abonné/i.test((await this.subscribeButton().innerText()).trim());
  }

  /** S'abonne si ce n'est pas déjà le cas (idempotent). */
  async subscribe(): Promise<void> {
    if (!(await this.isSubscribed())) {
      await this.subscribeButton().click();
      await expect(this.subscribeButton()).toHaveText(/Abonné/i);
    }
  }

  /** Se désabonne si abonné (idempotent). */
  async unsubscribe(): Promise<void> {
    if (await this.isSubscribed()) {
      await this.subscribeButton().click();
      await expect(this.subscribeButton()).toHaveText(/S'abonner/i);
    }
  }

  async expectSubscribed(): Promise<void> {
    await expect(this.subscribeButton()).toHaveText(/Abonné/i);
  }

  /** Copie le lien de la fiche et vérifie le toast de confirmation (FIC-12). */
  async copyLinkAndExpectToast(): Promise<void> {
    // Autorise l'écriture presse-papier (best-effort : certains navigateurs ne la supportent pas).
    await this.page
      .context()
      .grantPermissions(["clipboard-read", "clipboard-write"])
      .catch(() => {});
    await this.byTestId("application-copy-link-btn").click();
    await this.expectToaster(/Lien copié dans le presse-papier/i);
  }

  // --- Conformités : éco-conception & homologation (#1825, CMP-*) ---
  // Libellés de ligne du tableau des conformités (`labels` du composant).
  private static readonly HOMOLOGATION_LABEL = "Homologation";
  private static readonly ECO_INDEX_LABEL = "Ecoconception";

  /** Ligne du tableau des conformités correspondant à un type (ciblée par son libellé). */
  private complianceRow(label: string): Locator {
    return this.byTestId("compliance-table")
      .locator("tbody tr")
      .filter({ hasText: label });
  }

  /** Ouvre le formulaire d'édition d'une conformité depuis sa ligne. */
  private async openComplianceEdit(label: string): Promise<void> {
    await this.complianceRow(label).getByTestId("compliance-edit-btn").click();
    await expect(this.byTestId("compliance-form-container")).toBeVisible();
  }

  /** Sélectionne un statut d'homologation (par libellé) et enregistre (CMP-01). */
  async setHomologationStatus(optionLabel: string): Promise<void> {
    await this.openComplianceEdit(ApplicationPage.HOMOLOGATION_LABEL);
    await this.byTestId("compliance-homologation-status").selectOption({
      label: optionLabel,
    });
    await this.byTestId("compliance-submit-btn").click();
    await this.expectToaster(/Conformité mise à jour avec succès/i);
  }

  /** Le résumé de la ligne homologation affiche le statut attendu (CMP-01). */
  async expectHomologationPreview(text: string | RegExp): Promise<void> {
    await expect(
      this.complianceRow(ApplicationPage.HOMOLOGATION_LABEL),
    ).toContainText(text);
  }

  /** Le résumé de la ligne éco-conception affiche le grade attendu (CMP-04). */
  async expectEcoIndexGrade(grade: string): Promise<void> {
    await expect(
      this.complianceRow(ApplicationPage.ECO_INDEX_LABEL),
    ).toContainText(new RegExp(`Score:\\s*${grade}\\b`));
  }

  /** Le résumé de la ligne éco-conception indique l'absence de score (CMP-03). */
  async expectEcoIndexNotCalculated(): Promise<void> {
    await expect(
      this.complianceRow(ApplicationPage.ECO_INDEX_LABEL),
    ).toContainText(/Non calculé/i);
  }

  /** Modifie l'URL cible éco-index et enregistre (déclenche le reset côté serveur, CMP-03). */
  async changeEcoIndexUrlAndSave(url: string): Promise<void> {
    await this.openComplianceEdit(ApplicationPage.ECO_INDEX_LABEL);
    await this.byTestId("ecoindex-target-url-input").fill(url);
    await this.byTestId("compliance-submit-btn").click();
    await this.expectToaster(/Conformité mise à jour avec succès/i);
  }

  /** Le bouton « Calculer » l'éco-index est actif (droit d'écriture conformité, CMP-02). */
  async expectEcoIndexScanEnabled(): Promise<void> {
    await expect(
      this.complianceRow(ApplicationPage.ECO_INDEX_LABEL).getByTestId(
        "compliance-scan-ecoindex-btn",
      ),
    ).toBeEnabled();
  }

  /** Le bouton « Calculer » l'éco-index est désactivé (Lecteur sans droit, CMP-02). */
  async expectEcoIndexScanDisabled(): Promise<void> {
    await expect(
      this.complianceRow(ApplicationPage.ECO_INDEX_LABEL).getByTestId(
        "compliance-scan-ecoindex-btn",
      ),
    ).toBeDisabled();
  }

  // --- Durées DIMA / PDMA : valeurs autorisées (#1901, CMP-05/06) ---
  /**
   * Ouvre l'édition d'un axe (par son libellé de ligne, p. ex. « DIMA ») et vérifie que la liste
   * déroulante de durée propose exactement les valeurs autorisées (en heures), dans l'ordre attendu.
   */
  async expectComplianceDurationOptions(
    rowLabel: string,
    durationTestId: string,
    expectedHours: number[],
  ): Promise<void> {
    await this.openComplianceEdit(rowLabel);
    const values = await this.byTestId(durationTestId)
      .locator("option")
      .evaluateAll((els) =>
        els
          .map((el) => (el as HTMLOptionElement).value)
          .filter((value) => value !== ""),
      );
    expect(values).toEqual(expectedHours.map(String));
  }

  // --- Onglet Acteurs : ajout & import MAIA (#1825, MAI-*) ---
  /** Ouvre le formulaire d'ajout d'acteur depuis l'onglet Acteurs. */
  async openAddActorForm(): Promise<void> {
    await this.openTab("tab-actors");
    await this.byTestId("actor-add-btn").click();
    // Le data-testid parent (`actor-form-container`) écrase `actor-form` sur le <form> (fallthrough Vue).
    await expect(this.byTestId("actor-form-container")).toBeVisible();
  }

  /** Saisit un email et importe les informations de l'acteur depuis MAIA (MAI-02). */
  async importActorFromMaia(email: string): Promise<void> {
    await this.byTestId("actor-email-input").fill(email);
    await this.byTestId("admin-user-sync-maia-btn").click();
    await this.expectToaster(/Organisation synchronisée depuis MAIA/i);
  }

  /** Le prénom de l'acteur a été renseigné (par l'import MAIA) — MAI-02. */
  async expectActorFirstnameFilled(): Promise<void> {
    await expect(this.byTestId("actor-firstname-input")).not.toHaveValue("");
  }

  /** Le champ email est positionné AVANT le champ organisation dans le formulaire (MAI-03). */
  async expectActorEmailBeforeOrganization(): Promise<void> {
    const emailBox = await this.byTestId("actor-email-input").boundingBox();
    const orgBox = await this.byTestId("actor-organization").boundingBox();
    expect(emailBox).not.toBeNull();
    expect(orgBox).not.toBeNull();
    expect(emailBox!.y).toBeLessThan(orgBox!.y);
  }

  // --- CRU: Actors CRUD (CRU-01 to CRU-04) ---

  async editFirstActor(firstname: string, lastname: string): Promise<void> {
    await this.byTestId("actor-edit-btn").first().click();
    await expect(this.byTestId("actor-form-container")).toBeVisible();
    await this.byTestId("actor-firstname-input").fill(firstname);
    await this.byTestId("actor-lastname-input").fill(lastname);
    await this.byTestId("actor-submit-btn").click();
    await this.expectToaster(/sauvegardé avec succès|enregistré/i);
  }

  async expectActorRowContains(text: string): Promise<void> {
    await expect(
      this.byTestId("actor-tab").locator("tr", { hasText: text }).first(),
    ).toBeVisible();
  }

  async bulkDeleteActors(count: number): Promise<void> {
    const rows = this.byTestId("actor-tab").locator("tbody tr");
    for (let i = 0; i < count; i++) {
      await rows.nth(i).locator("input[type=checkbox]").check();
    }
    await this.byTestId("actor-bulk-delete-btn").click();
    await expect(async () => {
      await expect(this.byTestId("actor-delete-modal")).toBeVisible();
      await this.byTestId("actor-delete-modal")
        .getByRole("button", { name: /supprimer|confirmer/i })
        .click();
    }).toPass({ timeout: 5000 });
    await this.expectToaster(/supprimé|succès/i);
  }

  async addGroupActor(actorType: string, organization: string): Promise<void> {
    await this.byTestId("actor-add-btn").click();
    await expect(this.byTestId("actor-form-container")).toBeVisible();
    const checkbox = this.byTestId("actor-is-group-checkbox");
    await checkbox
      .locator("..")
      .getByText(/groupe/i)
      .click();
    await this.byTestId("actor-type-select").selectOption({
      label: actorType,
    });
    await this.byTestId("actor-organization").fill(organization);
    await this.byTestId("actor-submit-btn").click();
    await this.expectToaster(/sauvegardé avec succès|enregistré/i);
  }

  async expectActorAddDisabled(): Promise<void> {
    await expect(this.byTestId("actor-add-btn")).toBeDisabled();
  }

  async expectActorEmptyState(): Promise<void> {
    await expect(this.byTestId("actor-empty-state")).toBeVisible();
  }

  // --- CRU: Informations générales (CRU-05 to CRU-07) ---

  async openInfoEdit(): Promise<void> {
    await this.byTestId("info-edit-btn").click();
    await expect(this.byTestId("info-edit-modal")).toBeVisible();
  }

  async editInfos(
    label: string,
    description: string,
    priority: string,
  ): Promise<void> {
    await this.openInfoEdit();
    await this.byTestId("application-label").fill(label);
    await this.byTestId("application-description")
      .locator('[data-testid="markdown-textarea"]')
      .fill(description);
    await this.byTestId("application-priority-restart").selectOption(priority);
    await this.byTestId("application-submit-btn").click();
    await this.expectToaster(/succès|enregistré|mis à jour/i);
  }

  async expectTitle(label: string): Promise<void> {
    await expect(this.byTestId("application-title")).toContainText(label);
  }

  async expectDescription(description: string): Promise<void> {
    await expect(this.byTestId("info-description")).toContainText(description);
  }

  async expectPriority(priority: string): Promise<void> {
    await expect(this.byTestId("info-priority-badge")).toContainText(priority);
  }

  async addPurpose(): Promise<void> {
    await this.byTestId("application-purpose-add").click();
  }

  async addPopulation(): Promise<void> {
    await this.byTestId("application-population-add").click();
  }

  async editAndSaveInfos(): Promise<void> {
    await this.openInfoEdit();
    await this.byTestId("application-submit-btn").click();
    await this.expectToaster(/succès|enregistré|mis à jour/i);
  }

  // --- CRU: Delete application (CRU-09) ---

  async deleteApplication(confirmLabel: string): Promise<void> {
    await this.byTestId("application-delete-btn").click();
    await expect(this.byTestId("application-delete-modal")).toBeVisible();
    await this.byTestId("application-delete-input").fill(confirmLabel);
    await this.byTestId("application-delete-modal")
      .getByRole("button", { name: /supprimer|confirmer/i })
      .click();
  }

  // --- CRU: Hosting CRUD (CRU-10) ---

  async addHosting(label: string): Promise<void> {
    await this.byTestId("info-add-hosting-btn").click();
    await expect(this.byTestId("hosting-modal")).toBeVisible();
    await this.byTestId("hosting-label-input").fill(label);
    const optionSearch = this.byTestId("hosting-option-search-input");
    await expect(optionSearch).toBeVisible();
    const firstOption = this.byTestId("hosting-options-list")
      .locator("option")
      .first();
    await expect(firstOption).toBeAttached();
    const optionText = await firstOption.textContent();
    await optionSearch.fill(optionText?.trim() ?? "");
    await expect(this.byTestId("hosting-submit-btn")).toBeEnabled();
    await this.byTestId("hosting-submit-btn").click();
    await this.expectToaster(/succès|enregistré|créé/i);
  }

  async editFirstHosting(newLabel: string): Promise<void> {
    await this.byTestId("hosting-edit-btn").first().click();
    await expect(this.byTestId("hosting-modal")).toBeVisible();
    await this.byTestId("hosting-label-input").fill(newLabel);
    await expect(this.byTestId("hosting-submit-btn")).toBeEnabled();
    await this.byTestId("hosting-submit-btn").click();
    await this.expectToaster(/succès|enregistré|mis à jour/i);
    await expect(this.byTestId("hosting-modal")).toBeHidden();
  }

  async deleteFirstHosting(): Promise<void> {
    await this.byTestId("hosting-delete-btn").first().click();
    await expect(this.byTestId("delete-confirm-btn")).toBeVisible();
    await this.byTestId("delete-confirm-btn").click();
    await this.expectToaster(/succès|supprimé/i);
  }

  // --- CRU: Label / nom alternatif CRUD (CRU-11) ---

  async addLabel(value: string): Promise<void> {
    await this.byTestId("info-add-label-btn").click();
    await expect(this.byTestId("label-modal")).toBeVisible();
    await this.byTestId("label-value-input").fill(value);
    await this.byTestId("label-submit-btn").click();
    await this.expectToaster(/succès|enregistré|créé/i);
  }

  async editFirstLabel(newValue: string): Promise<void> {
    await this.byTestId("label-edit-btn").first().click();
    await expect(this.byTestId("label-modal")).toBeVisible();
    await this.byTestId("label-value-input").fill(newValue);
    await this.byTestId("label-submit-btn").click();
    await this.expectToaster(/succès|enregistré|mis à jour/i);
  }

  async deleteFirstLabel(): Promise<void> {
    await this.byTestId("label-delete-btn").first().click();
    await expect(this.byTestId("delete-confirm-btn")).toBeVisible();
    await this.byTestId("delete-confirm-btn").click();
    await this.expectToaster(/succès|supprimé/i);
  }

  // --- CRU: Statuses CRUD (CRU-12) ---

  async addStatus(statusValue: string): Promise<void> {
    await this.byTestId("add-status-btn").click();
    await expect(this.byTestId("status-form-modal")).toBeVisible();
    await this.byTestId("status-select").selectOption(statusValue);
    await this.byTestId("status-submit-btn").click();
    await this.expectToaster(/succès|enregistré|créé/i);
  }

  async editFirstStatus(newStatusValue: string): Promise<void> {
    await this.byTestId("status-edit-btn").first().click();
    await expect(this.byTestId("status-form-modal")).toBeVisible();
    await this.byTestId("status-select").selectOption(newStatusValue);
    await this.byTestId("status-submit-btn").click();
    await this.expectToaster(/succès|enregistré|mis à jour/i);
  }

  async deleteFirstStatus(): Promise<void> {
    await this.byTestId("status-delete-btn").first().click();
    await expect(this.byTestId("delete-status-modal")).toBeVisible();
    await this.byTestId("delete-status-modal")
      .getByRole("button", { name: /supprimer/i })
      .click();
    await this.expectToaster(/succès|supprimé/i);
  }

  async expectStatusesTableContains(text: string): Promise<void> {
    await expect(
      this.byTestId("statuses-table").locator("tr", { hasText: text }).first(),
    ).toBeVisible();
  }

  // --- CRU: Relations CRUD (CRU-13) ---

  private addRelationBtn(): Locator {
    return this.page.getByRole("button", {
      name: /Ajouter une relation/i,
    });
  }

  async addRelation(targetLabel: string): Promise<void> {
    const btn = this.addRelationBtn();
    await expect(btn).toBeEnabled();
    await btn.click();
    const input = this.page
      .locator('[data-testid="relation-suggestions-input"] input')
      .first();
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.fill(targetLabel);
    const suggestionsList = this.page
      .locator('[data-testid="suggestions-list"]')
      .first();
    await expect(suggestionsList).toBeVisible({ timeout: 10000 });
    // Sélectionne la suggestion correspondant EXACTEMENT à la cible (pas la 1ʳᵉ, non déterministe) ;
    // le filtre par texte laisse Playwright auto-attendre la stabilisation de la liste débouncée.
    await suggestionsList
      .locator(".suggestion-item", { hasText: targetLabel })
      .first()
      .click();
    const saveBtn = this.page
      .getByRole("button", { name: /Enregistrer/i })
      .first();
    await expect(saveBtn).toBeVisible({ timeout: 5000 });
    await saveBtn.click();
    await this.expectToaster(/succès|enregistré|créé/i);
  }

  async editFirstRelationType(typeLabel: string): Promise<void> {
    await this.byTestId("relation-edit-btn").first().click();
    await expect(this.byTestId("relation-edit-modal")).toBeVisible();
    await this.byTestId("edit-relation-type-select").selectOption({
      label: typeLabel,
    });
    await this.byTestId("edit-relation-save-btn").click();
    await this.expectToaster(/succès|enregistré|mis à jour/i);
  }

  async deleteSelectedRelations(): Promise<void> {
    const rows = this.byTestId("relations-table").locator("tbody tr");
    await rows.first().locator("input[type=checkbox]").check();
    await this.byTestId("relation-delete-selected-btn").click();
    await expect(async () => {
      await expect(this.byTestId("relation-delete-modal")).toBeVisible();
      await this.byTestId("relation-delete-modal")
        .getByRole("button", { name: /supprimer|confirmer/i })
        .click();
    }).toPass({ timeout: 5000 });
    await this.expectToaster(/supprimé|succès/i);
  }

  async expectRelationsTableContains(text: string): Promise<void> {
    await expect(
      this.byTestId("relations-table").locator("tr", { hasText: text }).first(),
    ).toBeVisible();
  }

  async expectRelationsEmpty(): Promise<void> {
    await expect(this.byTestId("relations-empty")).toBeVisible();
  }

  // --- CRU: Links CRUD (CRU-14) ---

  async addLink(url: string, description: string): Promise<void> {
    await this.byTestId("link-add-btn").click();
    await expect(this.byTestId("link-modal")).toBeVisible();
    await this.byTestId("link-type-select").selectOption("documentation");
    await this.byTestId("link-url-input").fill(url);
    await this.byTestId("link-description-input").fill(description);
    await this.byTestId("link-submit-btn").click();
    await this.expectToaster(/succès|enregistré|créé/i);
  }

  async editFirstLink(newUrl: string): Promise<void> {
    await this.byTestId("link-edit-btn").first().click();
    await expect(this.byTestId("link-modal")).toBeVisible();
    await this.byTestId("link-url-input").fill(newUrl);
    await this.byTestId("link-submit-btn").click();
    await this.expectToaster(/succès|enregistré|mis à jour/i);
  }

  async deleteFirstLink(): Promise<void> {
    await this.byTestId("link-delete-btn").first().click();
    await expect(this.byTestId("delete-confirm-btn")).toBeVisible();
    await this.byTestId("delete-confirm-btn").click();
    await this.expectToaster(/succès|supprimé/i);
  }

  async expectLinkItemContains(text: string): Promise<void> {
    await expect(this.byTestId("link-item").first()).toContainText(text);
  }

  // --- CRU: RGAA CRUD (CRU-15) ---

  async addRgaaDeclaration(serviceUrl: string, score: string): Promise<void> {
    await this.byTestId("rgaa-add-btn").click();
    await this.byTestId("rgaa-form-service-url").fill(serviceUrl);
    await this.byTestId("rgaa-form-score").fill(score);
    await this.byTestId("rgaa-form-submit").click();
    await this.expectToaster(/succès|enregistré|créé/i);
  }

  async editFirstRgaa(newScore: string): Promise<void> {
    await this.byTestId("rgaa-edit-btn").first().click();
    await this.byTestId("rgaa-form-score").fill(newScore);
    await this.byTestId("rgaa-form-submit").click();
    await this.expectToaster(/succès|enregistré|mis à jour/i);
  }

  async deleteFirstRgaa(): Promise<void> {
    this.page.once("dialog", (dialog) => dialog.accept());
    await this.byTestId("rgaa-delete-btn").first().click();
    await this.expectToaster(/supprimé/i);
  }

  async expectRgaaTableContains(text: string): Promise<void> {
    await expect(
      this.byTestId("rgaa-table").locator("tr", { hasText: text }).first(),
    ).toBeVisible();
  }

  async expectRgaaEmpty(): Promise<void> {
    await expect(this.byTestId("rgaa-empty")).toBeVisible();
  }

  // --- Catalogue de données applicatives : rattachement / création / édition / détachement
  // depuis l'onglet Données (DAT-07 à DAT-10, feature CRUD catalogue de données) ---

  /** Ligne portant les boutons « Modifier »/« Détacher » de `dataApplicationId`. */
  private dataRow(dataApplicationId: string): Locator {
    return this.byTestId(`data-application-edit-btn-${dataApplicationId}`)
      .locator("..")
      .locator("..");
  }

  /** Ouvre le modal de rattachement/création d'une donnée (DAT-07, DAT-08). */
  async openAddDataModal(): Promise<void> {
    await this.byTestId("data-application-add-btn").click();
    await expect(this.byTestId("data-application-modal")).toBeVisible();
  }

  /**
   * Recherche une donnée existante du catalogue par un terme (≥ 3 caractères, recherche serveur
   * débouncée 300 ms) puis sélectionne l'option correspondant à `descriptionId` dans la datalist.
   * Un `<option>` de `<datalist>` natif n'est jamais « visible » pour Playwright : on attend
   * `state: "attached"`. Le texte injecté dans le champ est celui réellement rendu par l'option
   * (nom + famille éventuelle entre parenthèses), jamais reconstruit côté test — DAT-07.
   */
  async searchAndSelectExistingData(
    searchTerm: string,
    descriptionId: string,
  ): Promise<void> {
    const input = this.byTestId("data-description-search-input");
    await input.fill(searchTerm);
    const option = this.byTestId(`data-description-option-${descriptionId}`);
    await option.waitFor({ state: "attached" });
    const optionText = (await option.textContent())?.trim() ?? "";
    await input.fill(optionText);
  }

  /** Bascule le modal en mode « création d'une nouvelle donnée de catalogue » (DAT-08). */
  async switchToCreateNewDescription(): Promise<void> {
    await this.byTestId("data-application-create-description-toggle").click();
  }

  /** Renseigne le nom de la nouvelle donnée de catalogue (DAT-08). */
  async fillNewDescriptionName(name: string): Promise<void> {
    await this.byTestId("new-description-name-input").fill(name);
  }

  /**
   * Crée une nouvelle famille métier inline (bouton « + Créer une nouvelle famille » puis « Ajouter »)
   * et l'ajoute au panier de familles de la donnée en cours de création/édition — DAT-08, DAT-13.
   */
  async createNewFamilyInline(path: string): Promise<void> {
    await this.byTestId("new-description-create-family-toggle").click();
    await this.byTestId("new-family-path-input").fill(path);
    await this.byTestId("new-family-add-btn").click();
  }

  /**
   * Ajoute une famille métier EXISTANTE au panier de familles via le picker `AccessibleAutocomplete`
   * (recherche par chemin, sélection par option accessible) — DAT-13, DAT-14.
   */
  async addExistingFamily(familyPath: string): Promise<void> {
    const picker = this.byTestId("new-description-family-search");
    await picker.locator("input").fill(familyPath);
    const option = picker.getByRole("option", { name: familyPath });
    await expect(option).toBeVisible();
    await option.click();
  }

  /** Retire une famille du panier en cliquant son chip (identique en création et en édition) — DAT-14. */
  async removeFamilyChip(familyPath: string): Promise<void> {
    await this.byTestId("new-description-families")
      .locator(".fr-tag", { hasText: familyPath })
      .click();
  }

  /**
   * Ajoute une application source au panier via le picker `AccessibleAutocomplete` (recherche par
   * libellé, sélection par option accessible) — DAT-15, DAT-16.
   */
  async addApplicationSource(label: string): Promise<void> {
    const picker = this.byTestId("new-description-application-source-search");
    await picker.locator("input").fill(label);
    const option = picker.getByRole("option", { name: label });
    await expect(option).toBeVisible();
    await option.click();
  }

  /**
   * Ajoute un tag à la nouvelle donnée via le picker `AccessibleAutocomplete` : les suggestions
   * n'ont pas de `data-testid` par item mais sont exposées en `role="option"` (nom du tag = nom
   * accessible) — DAT-08.
   */
  async addNewDescriptionTag(tagName: string): Promise<void> {
    const picker = this.byTestId("new-description-tag-search");
    await picker.locator("input").fill(tagName);
    const option = picker.getByRole("option", { name: tagName });
    await expect(option).toBeVisible();
    await option.click();
  }

  /**
   * Soumet le modal de rattachement/création (POST) et renvoie l'identifiant de la ligne
   * `DataApplication` créée, capturé depuis la réponse réseau, pour permettre un nettoyage précis
   * en `finally` (DAT-07, DAT-08).
   */
  async submitNewDataAttachment(): Promise<string | null> {
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) =>
          /\/data-catalog\/applications\/[^/]+$/.test(r.url()) &&
          r.request().method() === "POST",
      ),
      this.byTestId("data-application-submit-btn").click(),
    ]);
    await this.expectToaster(/succès/i);
    const body = (await response.json().catch(() => null)) as {
      id?: string;
    } | null;
    return body?.id ?? null;
  }

  /** Ouvre le modal d'édition d'une donnée déjà rattachée, depuis sa ligne (DAT-09). */
  async openEditDataModal(dataApplicationId: string): Promise<void> {
    await this.byTestId(
      `data-application-edit-btn-${dataApplicationId}`,
    ).click();
    await expect(this.byTestId("data-application-modal")).toBeVisible();
  }

  /** En édition, le champ de recherche de donnée est verrouillé (la donnée liée ne se remplace pas) — DAT-09. */
  async expectDataSearchLocked(): Promise<void> {
    await expect(this.byTestId("data-description-search-input")).toBeDisabled();
  }

  /** Valeur actuellement sélectionnée du select sensibilité, modal d'édition déjà ouvert (DAT-09). */
  currentSensibilityValue(): Promise<string> {
    return this.byTestId("data-application-sensibility-select").inputValue();
  }

  /**
   * Sélectionne, dans le modal d'édition déjà ouvert, une sensibilité DIFFÉRENTE de `excludeValue`
   * et renvoie `{ value, label }` ; `null` si le référentiel n'expose aucune alternative (jeu de
   * données trop pauvre — repli `test.skip` côté spec) — DAT-09.
   */
  async selectDifferentSensibility(
    excludeValue: string,
  ): Promise<{ value: string; label: string } | null> {
    const select = this.byTestId("data-application-sensibility-select");
    const options = await select.locator("option").evaluateAll(
      (els, exclude) =>
        els
          .map((el) => ({
            value: (el as HTMLOptionElement).value,
            label: (el.textContent ?? "").trim(),
          }))
          .filter((o) => o.value !== "" && o.value !== exclude),
      excludeValue,
    );
    if (!options.length) return null;
    const [chosen] = options;
    await select.selectOption(chosen.value);
    return chosen;
  }

  /** Soumet le modal d'édition (formulaire déjà rempli) — DAT-09. */
  async submitDataEdit(): Promise<void> {
    await this.byTestId("data-application-submit-btn").click();
    await this.expectToaster(/succès/i);
  }

  /**
   * Rouvre le modal d'édition d'une donnée et lui applique la sensibilité `value` (id d'option) —
   * sert à restaurer l'état initial en `finally` (DAT-09).
   */
  async setDataSensibility(
    dataApplicationId: string,
    value: string,
  ): Promise<void> {
    await this.openEditDataModal(dataApplicationId);
    await this.byTestId("data-application-sensibility-select").selectOption(
      value,
    );
    await this.submitDataEdit();
  }

  /** La ligne de la donnée `dataApplicationId` affiche le libellé de sensibilité attendu (DAT-09). */
  async expectDataRowSensibility(
    dataApplicationId: string,
    label: string,
  ): Promise<void> {
    await expect(this.dataRow(dataApplicationId)).toContainText(label);
  }

  /** Détache une donnée depuis sa ligne dans l'onglet Données (DAT-10). */
  async deleteDataRow(dataApplicationId: string): Promise<void> {
    await this.byTestId(
      `data-application-delete-btn-${dataApplicationId}`,
    ).click();
    await expect(this.byTestId("delete-confirmation-modal")).toBeVisible();
    await this.byTestId("delete-confirm-btn").click();
    await this.expectToaster(/succès/i);
  }

  /** La ligne de la donnée `dataApplicationId` n'est plus présente dans le tableau (DAT-10). */
  async expectDataRowAbsent(dataApplicationId: string): Promise<void> {
    await expect(
      this.byTestId(`data-application-delete-btn-${dataApplicationId}`),
    ).toHaveCount(0);
  }

  /** Une ligne du tableau Données contient `text` (ex. le nom) — DAT-07, DAT-08. */
  async expectDataRowContains(text: string): Promise<void> {
    await expect(
      this.byTestId("data-application-table")
        .locator("tbody tr", { hasText: text })
        .first(),
    ).toBeVisible();
  }

  /** La ligne portant `rowText` (ex. le nom) contient aussi tous les `additionalTexts` (ex. les familles) — DAT-08, DAT-13. */
  async expectDataRowContainsAll(
    rowText: string,
    additionalTexts: string[],
  ): Promise<void> {
    const row = this.byTestId("data-application-table")
      .locator("tbody tr", { hasText: rowText })
      .first();
    await expect(row).toBeVisible();
    for (const text of additionalTexts) {
      await expect(row).toContainText(text);
    }
  }

  /** La ligne `dataApplicationId` contient `text` (ex. une famille ajoutée) — DAT-14. */
  async expectDataRowByIdContains(
    dataApplicationId: string,
    text: string,
  ): Promise<void> {
    await expect(this.dataRow(dataApplicationId)).toContainText(text);
  }

  /** La ligne `dataApplicationId` NE contient PAS `text` (ex. une famille retirée) — DAT-14. */
  async expectDataRowNotContains(
    dataApplicationId: string,
    text: string,
  ): Promise<void> {
    await expect(this.dataRow(dataApplicationId)).not.toContainText(text);
  }

  /**
   * Clique le chip cliquable « application source » (libellé `label`) de la ligne
   * `dataApplicationId`, qui redirige vers la fiche de cette application source — DAT-15.
   */
  async clickApplicationSourceTag(
    dataApplicationId: string,
    label: string,
  ): Promise<void> {
    await this.dataRow(dataApplicationId)
      .locator(".application-source-tag", { hasText: label })
      .click();
  }

  /** La navigation a redirigé vers la fiche de l'application `applicationId` — DAT-15, DAT-16. */
  async expectOnApplicationProfile(applicationId: string): Promise<void> {
    await expect(this.page).toHaveURL(
      new RegExp(`/applications/${applicationId}(?:/|$)`),
    );
  }
}
