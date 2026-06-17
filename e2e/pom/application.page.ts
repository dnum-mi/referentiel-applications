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

  // --- Axe RGAA, section dédiée en bas de l'onglet conformités (FIC-06) ---
  async expectRgaaSectionVisible(): Promise<void> {
    await expect(this.page.getByText(/Conformités RGAA/i)).toBeVisible();
    await expect(
      this.byTestId("rgaa-empty").or(this.byTestId("rgaa-add-btn")).first(),
    ).toBeVisible();
  }

  // --- Onglet Sources de données (FIC-09) ---
  async expectDataSourcesTabLoaded(): Promise<void> {
    await expect(this.byTestId("data-application-table")).toBeVisible();
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

  // --- Onglet Modifications / historique (FIC-14) ---
  async expectModificationsTabLoaded(): Promise<void> {
    await expect(this.byTestId("modifications-table")).toBeVisible();
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
    await input.fill(targetLabel.slice(0, 5));
    const suggestionsList = this.page
      .locator('[data-testid="suggestions-list"]')
      .first();
    await expect(suggestionsList).toBeVisible({ timeout: 10000 });
    await suggestionsList.locator(".suggestion-item").first().click();
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
}
