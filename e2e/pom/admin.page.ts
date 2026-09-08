import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

/** Page Object — Administration & matrice de permissions (`/administration`). */
export class AdminPage extends BasePage {
  private adminTabs = () => this.byTestId("admin-tabs");
  private usersTable = () => this.byTestId("admin-users-table");
  private permsTable = () => this.byTestId("app-perms-table");
  private permsSave = () => this.byTestId("app-perms-save-btn");
  private userSearch = () => this.byTestId("admin-user-search");

  async open(): Promise<void> {
    await this.goto("/administration");
    await expect(this.adminTabs()).toBeVisible();
  }

  /** Tente d'aller sur la page admin sans présumer de l'accès (cas non-admin). */
  async goToAdministration(): Promise<void> {
    await this.goto("/administration");
  }

  async expectLoaded(): Promise<void> {
    await expect(this.adminTabs()).toBeVisible();
    await expect(this.usersTable()).toBeVisible();
  }

  // --- Tuiles thématiques (#2419) : chaque thème donne accès à un sous-ensemble d'onglets. ---

  private themeTile = (id: string) => this.byTestId(`admin-theme-tile-${id}`);

  /** Sélectionne le thème `id` (idempotent : sans effet néfaste si déjà actif). */
  private async switchToTheme(id: string): Promise<void> {
    await this.themeTile(id).click();
  }

  /** #2446 — Un thème dont aucun onglet n'est accessible n'est pas proposé du tout. */
  async expectThemeTileAbsent(id: string): Promise<void> {
    await expect(this.themeTile(id)).toHaveCount(0);
  }

  async expectThemeTileVisible(id: string): Promise<void> {
    await expect(this.themeTile(id)).toBeVisible();
  }

  /** Onglet visible dans la barre du thème actif. */
  async expectTabVisible(name: RegExp): Promise<void> {
    await expect(this.adminTabs().getByRole("tab", { name })).toBeVisible();
  }

  /** Onglet absent de la barre du thème actif (droits insuffisants). */
  async expectTabAbsent(name: RegExp): Promise<void> {
    await expect(this.adminTabs().getByRole("tab", { name })).toHaveCount(0);
  }

  private editModal = () => this.byTestId("admin-edit-user-modal");

  async searchUser(value: string): Promise<void> {
    // `admin-user-search` est un <form> : on remplit l'<input> à l'intérieur.
    // On attend le refetch débouncé de la liste : sinon il peut survenir APRÈS l'ouverture du modal
    // d'édition et le démonter (la ligne porte le modal) — cf. #1830.
    const refetch = this.page
      .waitForResponse(
        (r) =>
          /\/users\?/.test(r.url()) &&
          r.url().includes("search") &&
          r.request().method() === "GET",
        { timeout: 10_000 },
      )
      .catch(() => null);
    await this.userSearch().locator("input").fill(value);
    await refetch;
  }

  /** Recherche un utilisateur et vérifie qu'il apparaît dans la table (PRM-03). */
  async expectUserRow(email: string): Promise<void> {
    await this.searchUser(email);
    await expect(this.usersTable()).toContainText(email);
  }

  /**
   * Cible la LIGNE dont la cellule Email vaut EXACTEMENT `email`.
   * Le matching par sous-chaîne (`hasText`) ne suffit pas : `admin@example.com` est contenu dans
   * `scope-admin@example.com`, ce qui ramènerait deux lignes (cf. #1891). On scope donc sur la
   * cellule email en correspondance exacte.
   */
  private userRow(email: string) {
    // Cellule email dont le texte est EXACTEMENT `email` (regex ancrée) : la colonne Email
    // rend uniquement l'adresse, donc `^email$` distingue `admin@example.com` de `scope-admin@example.com`.
    const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return this.usersTable()
      .locator("tbody tr")
      .filter({
        has: this.page.locator("td", { hasText: new RegExp(`^${escaped}$`) }),
      });
  }

  /**
   * Ouvre le modal d'édition de l'utilisateur dont la LIGNE contient l'email.
   * (On scope à la ligne pour ne jamais éditer un autre compte — ex. l'admin — par erreur.)
   */
  async openEditUser(email: string): Promise<void> {
    await this.expectUserRow(email);
    const row = this.userRow(email);
    await row.getByTestId("admin-user-edit-btn").first().click();
    await expect(this.editModal()).toBeVisible();
    // Modal pleinement rendu (footer présent) avant toute interaction → évite les races de re-render.
    await expect(
      this.editModal().getByTestId("admin-save-perms-btn"),
    ).toBeVisible();
    // DsfrModal pose son focus initial ~100 ms APRÈS l'ouverture (setTimeout interne de
    // vue-dsfr) : interagir avant se fait voler le focus en pleine saisie — et Espace/Entrée
    // sur le bouton « Fermer » fermerait le modal « tout seul » (#1830). On attend que le
    // focus soit posé QUELQUE PART dans le modal (sans figer la cible exacte, interne à la lib).
    await expect
      .poll(() =>
        this.editModal().evaluate((el) => el.contains(document.activeElement)),
      )
      .toBe(true);
  }

  /**
   * Édite l'organisation d'un utilisateur via la recherche du modal et enregistre (#1830 :
   * la saisie ne doit pas perdre le focus et le modal doit rester ouvert pendant tout le flux).
   */
  async editUserOrganizationAndSave(
    email: string,
    orgSearch: string,
    orgPath: string,
  ): Promise<void> {
    await this.openEditUser(email);
    const orgField = this.editModal().getByTestId("user-organization-search");
    const input = orgField.locator("input").first();
    await input.click();
    await input.pressSequentially(orgSearch, { delay: 50 });
    // La saisie complète est bien dans le champ (aucun vol de focus pendant la frappe).
    await expect(input).toHaveValue(orgSearch);
    // Les résultats alimentent le select ; on choisit l'organisation par son chemin exact.
    await orgField.getByRole("combobox").selectOption({ label: orgPath });
    // Anti-#1830 : le modal est TOUJOURS ouvert après recherche + sélection.
    await expect(this.editModal()).toBeVisible();
    await this.saveUserEdit();
  }

  /**
   * Change le rôle et enregistre (PRM-04). On choisit un rôle **non-VISITOR** non coché :
   * sélectionner VISITOR masque le champ « périmètre » (`v-show`), ce qui décale la mise en page
   * et rend le bouton Enregistrer instable. Éviter ce rôle élimine le flaky (pas de re-render).
   */
  async changeRoleAndSave(): Promise<void> {
    const group = this.editModal().getByTestId("admin-level-radio");
    const target = group.locator('input[type=radio][value="CONTRIBUTOR"]');
    const id = await target.getAttribute("id");
    await group.locator(`label[for="${id}"]`).click();
    await expect(target).toBeChecked(); // attend la stabilisation du formulaire
    await this.saveUserEdit();
  }

  /** Bascule la 1ʳᵉ permission additionnelle et enregistre (PRM-05). */
  async toggleAdditionalPermissionAndSave(): Promise<void> {
    const box = this.editModal()
      .getByTestId("additional-permissions-checkbox")
      .locator("input[type=checkbox]")
      .first();
    const current = await box.isChecked();
    await box.setChecked(!current, { force: true });
    await expect(box).toBeChecked({ checked: !current }); // attend la stabilisation du formulaire
    await this.saveUserEdit();
  }

  /** Enregistre l'édition utilisateur : un seul clic (pas de re-clic qui rouvrirait un modal fermé). */
  private async saveUserEdit(): Promise<void> {
    const save = this.editModal().getByTestId("admin-save-perms-btn");
    await expect(save).toBeVisible();
    await expect(save).toBeEnabled();
    await save.click();
    await this.expectToaster(/mis à jour avec succès/i);
  }

  /**
   * Édite le rôle d'un utilisateur cible et enregistre (SCP-03 : un admin scopé édite un user de son
   * périmètre). Réussite = toast de succès, donc le périmètre du requérant a autorisé l'édition.
   */
  async editUserRoleWithinScopeAndSave(email: string): Promise<void> {
    await this.openEditUser(email);
    await this.changeRoleAndSave();
  }

  private matrixPanel = () => this.byTestId("panel-app-perms-matrix");

  /** Ouvre l'onglet « Matrice des permissions » et attend le panneau + la table. */
  async openPermsMatrixTab(): Promise<void> {
    await this.switchToTheme("users-rights");
    await this.adminTabs()
      .getByRole("tab", { name: "Matrice des permissions" })
      .click();
    await expect(this.matrixPanel()).toBeVisible();
    await expect(this.permsTable()).toBeVisible();
  }

  async expectPermsMatrixEditable(): Promise<void> {
    await expect(this.permsTable()).toBeVisible();
    await expect(this.permsSave()).toBeVisible();
  }

  private permsLegend = () => this.byTestId("app-perms-legend");

  /**
   * Vérifie que la légende de la matrice (`-`/`RO`/`RW`) est visible et qu'elle précède la table
   * dans le DOM — donc affichée au-dessus (PRM-13). Purement en lecture, aucune donnée requise.
   */
  async expectPermsMatrixLegendVisible(): Promise<void> {
    await expect(this.permsLegend()).toBeVisible();
    await expect(this.permsLegend()).toContainText(/aucun droit/i);
    // `xpath=following::` : n'a de résultat que si la table suit la légende dans le DOM.
    await expect(
      this.permsLegend().locator(
        'xpath=following::*[@data-testid="app-perms-table"]',
      ),
    ).toHaveCount(1);
  }

  /**
   * Modifie une cellule de la matrice (toggle `-`/`RO`/`RW`), enregistre, puis rétablit la valeur
   * d'origine en recyclant le toggle (PRM-07).
   */
  async editMatrixAndRestore(): Promise<void> {
    // Le testid `app-perms-select-*` (passé par le parent) écrase `permission-toggle`.
    // On vise un toggle Lecture/Écriture (texte `-` / `RO` / `RW`) de la colonne « App ».
    const toggle = () =>
      this.matrixPanel().locator('[data-testid$="-App"]').first();
    await expect(toggle()).toBeVisible();
    const original = (await toggle().innerText()).trim();

    await toggle().click();
    await expect(toggle()).not.toHaveText(original);
    await this.permsSave().click();
    await this.expectToaster(
      /Matrice des permissions mise à jour avec succès/i,
    );

    // Rétablissement : on recycle le toggle jusqu'à retrouver la valeur d'origine.
    for (
      let i = 0;
      i < 3 && (await toggle().innerText()).trim() !== original;
      i += 1
    ) {
      await toggle().click();
    }
    await this.permsSave().click();
    await this.expectToaster(
      /Matrice des permissions mise à jour avec succès/i,
    );
  }

  /**
   * Modifie une cellule de la matrice (toggle) et enregistre SANS restaurer (PRM-12).
   * L'appelant restaure via l'API dans son `finally`.
   */
  async editMatrixAndSave(): Promise<void> {
    const toggle = () =>
      this.matrixPanel().locator('[data-testid$="-App"]').first();
    await expect(toggle()).toBeVisible();
    const original = (await toggle().innerText()).trim();

    await toggle().click();
    await expect(toggle()).not.toHaveText(original);
    await this.permsSave().click();
    await this.expectToaster(
      /Matrice des permissions mise à jour avec succès/i,
    );
  }

  /** Vérifie qu'on n'est PAS sur la page admin (cas non-admin). */
  async expectAccessDenied(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/administration/);
  }

  // --- Impersonation (#1764) ---

  private impersonationBanner = () => this.byTestId("impersonation-banner");

  /** Impersonne l'utilisateur dont la LIGNE contient l'email (recharge l'app sous son identité). */
  async impersonateUser(email: string): Promise<void> {
    await this.expectUserRow(email);
    const row = this.userRow(email);
    const impersonated = this.page
      .waitForResponse(
        (r) =>
          /\/users\/[^/]+\/impersonate$/.test(r.url()) &&
          r.request().method() === "POST",
        { timeout: 10_000 },
      )
      .catch(() => null);
    await row.getByTestId("admin-user-impersonate-btn").first().click();
    await impersonated;
  }

  /** Vérifie que le bandeau d'impersonation est affiché pour `email`. */
  async expectImpersonationBanner(email: string): Promise<void> {
    await expect(this.impersonationBanner()).toBeVisible();
    await expect(this.impersonationBanner()).toContainText(email);
  }

  /** Vérifie qu'aucun bouton d'impersonation n'est proposé sur la ligne de `email` (ex. soi-même). */
  async expectImpersonateUnavailable(email: string): Promise<void> {
    await this.expectUserRow(email);
    const row = this.userRow(email);
    await expect(row.getByTestId("admin-user-impersonate-btn")).toHaveCount(0);
  }

  /**
   * Vérifie que `email` est INTROUVABLE dans la liste, recherche à l'appui.
   * Depuis #2230/#2327 un admin scopé ne liste que les utilisateurs de son périmètre : une cible
   * hors périmètre n'est plus « affichée sans bouton », elle n'est plus listée du tout.
   *
   * L'assertion porte d'abord sur le message de statut : sans lui le test serait satisfait d'avance
   * (la table ne contient déjà pas la cible AVANT la recherche), et un filtre resté sans effet
   * passerait inaperçu. « Aucune donnée ne correspond » prouve que la requête a abouti à 0 résultat.
   */
  async expectUserAbsent(email: string): Promise<void> {
    await this.searchUser(email);
    await expect(this.byTestId("admin-users-status")).toContainText(
      /aucune donnée ne correspond/i,
    );
    await expect(this.usersTable()).not.toContainText(email);
  }

  /** Recharge la page et vérifie que l'impersonation de `email` est toujours active. */
  async expectImpersonationPersistsAfterReload(email: string): Promise<void> {
    await this.page.reload();
    await this.expectImpersonationBanner(email);
  }

  /** Arrête l'impersonation depuis le bandeau (recharge l'app sous l'identité admin). */
  async stopImpersonation(): Promise<void> {
    await this.byTestId("impersonation-stop-btn").click();
  }

  /** Vérifie que plus aucune impersonation n'est en cours. */
  async expectNotImpersonating(): Promise<void> {
    await expect(this.impersonationBanner()).toBeHidden();
  }

  // --- Onglet « Organisations » (ADM-01 to ADM-04) ---

  private orgsTable = () => this.byTestId("admin-organizations-table");
  private orgsSearch = () => this.byTestId("admin-organizations-search");

  async openOrganizationsTab(): Promise<void> {
    await this.switchToTheme("users-rights");
    await this.adminTabs()
      .getByRole("tab", { name: /organisations/i })
      .click();
    await expect(this.orgsTable()).toBeVisible();
  }

  // --- Onglet « Journal des actions » (#2061) ---

  private actionLogsTable = () => this.byTestId("admin-action-logs-table");
  private actionLogsSearch = () => this.byTestId("admin-action-logs-search");

  async openActionLogsTab(): Promise<void> {
    await this.switchToTheme("management");
    await this.adminTabs()
      .getByRole("tab", { name: /journal des actions/i })
      .click();
    await expect(
      this.actionLogsTable().or(this.byTestId("admin-action-logs-loading")),
    ).toBeVisible();
  }

  async searchActionLogs(value: string): Promise<void> {
    await this.actionLogsSearch().locator("input").fill(value);
    await this.actionLogsSearch()
      .getByRole("button", { name: /rechercher/i })
      .click();
  }

  async searchOrganization(value: string): Promise<void> {
    const refetch = this.page
      .waitForResponse(
        (r) =>
          /\/organizations\?/.test(r.url()) && r.request().method() === "GET",
        { timeout: 10_000 },
      )
      .catch(() => null);
    await this.orgsSearch().locator("input").fill(value);
    await refetch;
  }

  private visibleDialog() {
    return this.page.locator("dialog[open]").first();
  }

  async createOrganization(path: string, sigle?: string): Promise<void> {
    await this.byTestId("admin-create-organization-btn").click();
    const dialog = this.visibleDialog();
    await expect(dialog).toBeVisible();
    await dialog.getByLabel(/Chemin/i).fill(path);
    if (sigle) {
      await dialog.getByLabel(/Sigle/i).fill(sigle);
    }
    await dialog.getByRole("button", { name: /Enregistrer/i }).click();
    await this.expectToaster(/créée avec succès/i);
  }

  async expectOrganizationRow(path: string): Promise<void> {
    await this.searchOrganization(path);
    await expect(this.orgsTable()).toContainText(path);
  }

  async editOrganization(orgPath: string, newSigle: string): Promise<void> {
    await this.searchOrganization(orgPath);
    const row = this.orgsTable().locator("tr", { hasText: orgPath });
    await row.getByTestId("admin-organization-edit-btn").click();
    const dialog = this.visibleDialog();
    await expect(dialog).toBeVisible();
    await dialog.getByLabel(/Sigle/i).fill(newSigle);
    await dialog.getByRole("button", { name: /Enregistrer/i }).click();
    await this.expectToaster(/mise à jour avec succès/i);
  }

  async addMaiaReference(orgPath: string, ref: string): Promise<void> {
    await this.searchOrganization(orgPath);
    const row = this.orgsTable().locator("tr", { hasText: orgPath });
    await row.getByTestId("admin-organization-edit-btn").click();
    const dialog = this.visibleDialog();
    await expect(dialog).toBeVisible();
    await dialog.getByLabel(/Ajouter une référence MAIA/i).fill(ref);
    await dialog.getByTestId("organization-maia-reference-add-btn").click();
    await this.expectToaster(/Référence MAIA ajoutée/i);
  }

  async deleteMaiaReference(orgPath: string): Promise<void> {
    const dialog = this.visibleDialog();
    if (!(await dialog.isVisible().catch(() => false))) {
      await this.searchOrganization(orgPath);
      const row = this.orgsTable().locator("tr", { hasText: orgPath });
      await row.getByTestId("admin-organization-edit-btn").click();
      await expect(this.visibleDialog()).toBeVisible();
    }
    await this.visibleDialog()
      .getByTestId("organization-maia-reference-delete-btn")
      .first()
      .click();
    await this.expectToaster(/Référence MAIA supprimée/i);
  }

  async deleteOrganization(orgPath: string): Promise<void> {
    await this.searchOrganization(orgPath);
    const row = this.orgsTable().locator("tr", { hasText: orgPath });
    await row.getByTestId("admin-organization-delete-btn").click();
    await expect(this.byTestId("admin-delete-confirm-btn")).toBeVisible();
    await this.byTestId("admin-delete-confirm-btn").click();
    await this.expectToaster(/supprimée avec succès/i);
  }

  async expectOrganizationAbsent(path: string): Promise<void> {
    await this.searchOrganization(path);
    await expect(this.orgsTable()).not.toContainText(path);
  }

  // --- Onglet « Tags » (ADM-05) ---

  private tagsTable = () => this.byTestId("admin-tags-table");

  async openTagsTab(): Promise<void> {
    await this.switchToTheme("management");
    await this.adminTabs().getByRole("tab", { name: /tags/i }).click();
    await expect(this.tagsTable()).toBeVisible();
  }

  async createTag(name: string): Promise<void> {
    await this.byTestId("admin-create-tag-btn").click();
    const dialog = this.visibleDialog();
    await expect(dialog).toBeVisible();
    await dialog.getByLabel(/Nom du tag/i).fill(name);
    await dialog.getByRole("button", { name: /Enregistrer/i }).click();
    await this.expectToaster(/Tag créé avec succès/i);
  }

  async searchTag(value: string): Promise<void> {
    const refetch = this.page
      .waitForResponse(
        (r) => /\/tags\?/.test(r.url()) && r.request().method() === "GET",
        { timeout: 10_000 },
      )
      .catch(() => null);
    await this.byTestId("admin-tag-search").locator("input").fill(value);
    await refetch;
  }

  async expectTagRow(name: string): Promise<void> {
    await this.searchTag(name);
    await expect(this.tagsTable()).toContainText(name);
  }

  async editTag(name: string, newName: string): Promise<void> {
    await this.searchTag(name);
    const row = this.tagsTable().locator("tr", { hasText: name });
    await row.getByTestId("admin-tag-edit-btn").click();
    const dialog = this.visibleDialog();
    await expect(dialog).toBeVisible();
    await dialog.getByLabel(/Nom du tag/i).fill(newName);
    await dialog.getByRole("button", { name: /Enregistrer/i }).click();
    await this.expectToaster(/Tag mis à jour avec succès/i);
  }

  async deleteTag(name: string): Promise<void> {
    await this.searchTag(name);
    const row = this.tagsTable().locator("tr", { hasText: name });
    await row.getByTestId("admin-tag-delete-btn").click();
    await expect(this.byTestId("admin-delete-confirm-btn")).toBeVisible();
    await this.byTestId("admin-delete-confirm-btn").click();
    await this.expectToaster(/Tag supprimé avec succès/i);
  }

  // --- Onglet « Sources de noms alternatifs » (ADM-06) ---

  private labelSourcesTable = () => this.byTestId("admin-label-sources-table");

  async openLabelSourcesTab(): Promise<void> {
    await this.switchToTheme("management");
    await this.adminTabs()
      .getByRole("tab", { name: /sources/i })
      .click();
    await expect(this.labelSourcesTable()).toBeVisible();
  }

  async createLabelSource(source: string): Promise<void> {
    await this.byTestId("admin-create-label-source-btn").click();
    const dialog = this.visibleDialog();
    await expect(dialog).toBeVisible();
    await dialog.getByLabel(/Valeur de la source/i).fill(source);
    await dialog.getByRole("button", { name: /Enregistrer/i }).click();
    await this.expectToaster(/Source créée avec succès/i);
  }

  async searchLabelSource(value: string): Promise<void> {
    const refetch = this.page
      .waitForResponse(
        (r) =>
          /\/label-sources\?/.test(r.url()) && r.request().method() === "GET",
        { timeout: 10_000 },
      )
      .catch(() => null);
    await this.byTestId("admin-label-source-search")
      .locator("input")
      .fill(value);
    await refetch;
  }

  async expectLabelSourceRow(source: string): Promise<void> {
    await this.searchLabelSource(source);
    await expect(this.labelSourcesTable()).toContainText(source);
  }

  async editLabelSource(source: string, newSource: string): Promise<void> {
    await this.searchLabelSource(source);
    const row = this.labelSourcesTable().locator("tr", {
      hasText: source,
    });
    await row.getByTestId("admin-label-source-edit-btn").click();
    const dialog = this.visibleDialog();
    await expect(dialog).toBeVisible();
    await dialog.getByLabel(/Valeur de la source/i).fill(newSource);
    await dialog.getByRole("button", { name: /Enregistrer/i }).click();
    await this.expectToaster(/Source mise à jour avec succès/i);
  }

  async deleteLabelSource(source: string): Promise<void> {
    await this.searchLabelSource(source);
    const row = this.labelSourcesTable().locator("tr", {
      hasText: source,
    });
    await row.getByTestId("admin-label-source-delete-btn").click();
    await expect(this.byTestId("admin-delete-confirm-btn")).toBeVisible();
    await this.byTestId("admin-delete-confirm-btn").click();
    await this.expectToaster(/Source supprimée avec succès/i);
  }

  // --- Onglet « Campagnes dette IT » (ADM-07) ---

  private campaignsTable = () => this.byTestId("admin-campaigns-table");

  async openCampaignsTab(): Promise<void> {
    await this.switchToTheme("campaigns");
    await this.adminTabs()
      .getByRole("tab", { name: /campagnes dette/i })
      .click();
    await expect(this.campaignsTable()).toBeVisible();
  }

  async createCampaign(year: number, label?: string): Promise<void> {
    await this.byTestId("admin-create-campaign-btn").click();
    const dialog = this.visibleDialog();
    await expect(dialog).toBeVisible();
    await dialog.getByLabel(/Millésime/i).fill(String(year));
    if (label) {
      await dialog.getByLabel(/Libellé/i).fill(label);
    }
    await dialog.getByRole("button", { name: /Enregistrer/i }).click();
    await this.expectToaster(/Campagne créée avec succès/i);
  }

  async expectCampaignRow(year: number): Promise<void> {
    await expect(this.campaignsTable()).toContainText(String(year));
  }

  async deleteCampaign(year: number): Promise<void> {
    const row = this.campaignsTable().locator("tr", { hasText: String(year) });
    await row.getByTestId("admin-campaign-delete-btn").click();
    await expect(
      this.byTestId("admin-campaign-delete-confirm-btn"),
    ).toBeVisible();
    await this.byTestId("admin-campaign-delete-confirm-btn").click();
    await this.expectToaster(/Campagne supprimée avec succès/i);
  }

  // --- Onglet « Directions métier » (ADM-22, ADM-23) ---

  private businessDivisionsTable = () =>
    this.byTestId("admin-business-divisions-table");

  async openBusinessDivisionsTab(): Promise<void> {
    await this.switchToTheme("users-rights");
    await this.adminTabs()
      .getByRole("tab", { name: /directions métier/i })
      .click();
    await expect(this.businessDivisionsTable()).toBeVisible();
  }

  async searchBusinessDivision(value: string): Promise<void> {
    const refetch = this.page
      .waitForResponse(
        (r) =>
          /\/business-division\?/.test(r.url()) &&
          r.request().method() === "GET",
        { timeout: 10_000 },
      )
      .catch(() => null);
    await this.byTestId("admin-business-division-search")
      .locator("input")
      .fill(value);
    await refetch;
  }

  async createBusinessDivision(label: string): Promise<void> {
    await this.byTestId("admin-create-business-division-btn").click();
    const dialog = this.visibleDialog();
    await expect(dialog).toBeVisible();
    await dialog.getByLabel(/Nom de la direction métier/i).fill(label);
    await dialog.getByRole("button", { name: /Enregistrer/i }).click();
    await this.expectToaster(/Direction métier créée avec succès/i);
  }

  async expectBusinessDivisionRow(label: string): Promise<void> {
    await this.searchBusinessDivision(label);
    await expect(this.businessDivisionsTable()).toContainText(label);
  }

  async editBusinessDivision(label: string, newLabel: string): Promise<void> {
    await this.searchBusinessDivision(label);
    const row = this.businessDivisionsTable().locator("tr", {
      hasText: label,
    });
    await row.getByTestId("admin-business-division-edit-btn").click();
    const dialog = this.visibleDialog();
    await expect(dialog).toBeVisible();
    await dialog.getByLabel(/Nom de la direction métier/i).fill(newLabel);
    await dialog.getByRole("button", { name: /Enregistrer/i }).click();
    await this.expectToaster(/Direction métier mise à jour avec succès/i);
  }

  async deleteBusinessDivision(label: string): Promise<void> {
    await this.searchBusinessDivision(label);
    const row = this.businessDivisionsTable().locator("tr", {
      hasText: label,
    });
    await row.getByTestId("admin-business-division-delete-btn").click();
    await expect(
      this.byTestId("admin-business-division-delete-confirm-btn"),
    ).toBeVisible();
    await this.byTestId("admin-business-division-delete-confirm-btn").click();
    await this.expectToaster(/Direction métier supprimée avec succès/i);
  }

  /** Rattache (ou détache avec un libellé vide) une direction métier via la modale d'édition d'organisation. */
  async attachBusinessDivisionToOrganization(
    orgPath: string,
    divisionLabel: string,
  ): Promise<void> {
    await this.searchOrganization(orgPath);
    const row = this.orgsTable().locator("tr", { hasText: orgPath });
    await row.getByTestId("admin-organization-edit-btn").click();
    const dialog = this.visibleDialog();
    await expect(dialog).toBeVisible();
    await dialog
      .getByTestId("organization-business-division-select")
      .selectOption({ label: divisionLabel || "Aucune direction métier" });
    await dialog.getByRole("button", { name: /Enregistrer/i }).click();
    await this.expectToaster(/mise à jour avec succès/i);
  }

  async expectOrganizationBusinessDivision(
    orgPath: string,
    divisionLabel: string,
  ): Promise<void> {
    await this.searchOrganization(orgPath);
    const row = this.orgsTable().locator("tr", { hasText: orgPath });
    await expect(row).toContainText(divisionLabel);
  }

  // --- Onglet « Batch de données » : synchronisation MAIA (#1825, MAI-04) ---
  async openBatchDataTab(): Promise<void> {
    await this.switchToTheme("management");
    await this.adminTabs()
      .getByRole("tab", { name: "Batch de données" })
      .click();
    await expect(this.byTestId("admin-actor-maia-batch-btn")).toBeVisible();
  }

  /** Lance la synchronisation des acteurs avec MAIA et vérifie le retour (MAI-04). */
  async runMaiaActorBatchAndExpectToast(): Promise<void> {
    await this.byTestId("admin-actor-maia-batch-btn").click();
    await this.expectToaster(/Batch MAIA lancé en tâche de fond/i);
  }

  // --- Onglet « Batch de données » : import Excel générique (#751/#753, ADM-08..12) ---

  /** Sélectionne le classeur Excel et lance l'import, puis attend l'affichage du rapport. */
  async importExcel(file: {
    name: string;
    mimeType: string;
    buffer: Buffer;
  }): Promise<void> {
    await this.byTestId("admin-import-file").setInputFiles({
      name: file.name,
      mimeType: file.mimeType,
      buffer: file.buffer,
    });
    await this.byTestId("admin-import-submit").click();
    await expect(this.byTestId("admin-import-report")).toBeVisible();
  }

  // --- Onglet « Gestion des acteurs » (ADM-16 to ADM-20) ---

  private actorsTable = () => this.byTestId("admin-actors-table");
  private actorSearch = () => this.byTestId("admin-actor-search");

  async openActorsTab(): Promise<void> {
    await this.switchToTheme("users-rights");
    await this.adminTabs()
      .getByRole("tab", { name: /gestion des acteurs/i })
      .click();
    await expect(this.byTestId("admin-actors-title")).toBeVisible();
  }

  async searchActor(value: string): Promise<void> {
    const refetch = this.page
      .waitForResponse(
        (r) =>
          /\/actors\?/.test(r.url()) &&
          r.url().includes("search") &&
          r.request().method() === "GET",
        { timeout: 10_000 },
      )
      .catch(() => null);
    await this.actorSearch().locator("input").fill(value);
    await refetch;
  }

  async expectActorRow(email: string): Promise<void> {
    await this.searchActor(email);
    await expect(this.actorsTable()).toContainText(email);
  }

  async expectActorAbsent(email: string): Promise<void> {
    await this.searchActor(email);
    await expect(this.actorsTable()).not.toContainText(email);
  }

  private actorRow(email: string) {
    return this.actorsTable().locator("tr", { hasText: email });
  }

  /** Ouvre le modal de modification d'un acteur unique, change le nom, enregistre (ADM-17). */
  async editActorAndSave(email: string, newLastname: string): Promise<void> {
    await this.expectActorRow(email);
    const row = this.actorRow(email);
    await row.getByTestId("admin-actor-edit-btn").first().click();
    await expect(this.byTestId("actor-form")).toBeVisible();
    await this.page.getByLabel("Nom", { exact: true }).fill(newLastname);
    await this.page.getByRole("button", { name: /Enregistrer/i }).click();
    await this.expectToaster(/mis à jour avec succès/i);
  }

  /** Ouvre le modal de suppression d'un acteur unique, confirme (ADM-18). */
  async deleteActorAndConfirm(email: string): Promise<void> {
    await this.expectActorRow(email);
    const row = this.actorRow(email);
    await row.getByTestId("admin-actor-delete-btn").first().click();
    const dialog = this.visibleDialog();
    await expect(dialog).toBeVisible();
    await dialog.getByTestId("admin-actor-delete-confirm-btn").click();
    await this.expectToaster(/supprimé avec succès/i);
  }

  /** Ouvre le modal « Modifier tous » par email, change le prénom, enregistre (ADM-19). */
  async editAllActorsAndSave(
    email: string,
    newFirstname: string,
  ): Promise<void> {
    await this.expectActorRow(email);
    const row = this.actorRow(email);
    await row.getByTestId("admin-actor-edit-all-btn").first().click();
    const dialog = this.visibleDialog();
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Prénom").fill(newFirstname);
    await dialog.getByTestId("admin-actor-save-all-btn").click();
    await this.expectToaster(/acteur\(s\) mis à jour avec succès/i);
  }

  /** Ouvre le modal « Supprimer tous » par email, confirme (ADM-20). */
  async deleteAllActorsAndConfirm(email: string): Promise<void> {
    await this.expectActorRow(email);
    const row = this.actorRow(email);
    await row.getByTestId("admin-actor-delete-all-btn").first().click();
    const dialog = this.visibleDialog();
    await expect(dialog).toBeVisible();
    await dialog.getByTestId("admin-actor-delete-all-confirm-btn").click();
    await this.expectToaster(/acteur\(s\) supprimé\(s\) avec succès/i);
  }

  /** Vérifie le résumé du rapport d'exécution (créés / mis à jour / erreurs). */
  async expectImportReportSummary(text: string | RegExp): Promise<void> {
    await expect(this.byTestId("admin-import-report-summary")).toContainText(
      text,
    );
  }

  /** Vérifie que le rapport d'exécution est téléchargeable. */
  async expectImportReportDownloadable(): Promise<void> {
    await expect(this.byTestId("admin-import-report-download")).toBeVisible();
  }

  /** Vérifie que le détail du rapport (par ligne) contient un texte (ex. motif d'erreur). */
  async expectImportReportContains(text: string | RegExp): Promise<void> {
    await expect(this.byTestId("admin-import-report")).toContainText(text);
  }
}
