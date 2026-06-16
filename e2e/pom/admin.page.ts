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
   * Ouvre le modal d'édition de l'utilisateur dont la LIGNE contient l'email.
   * (On scope à la ligne pour ne jamais éditer un autre compte — ex. l'admin — par erreur.)
   */
  async openEditUser(email: string): Promise<void> {
    await this.expectUserRow(email);
    const row = this.usersTable().locator("tr", { hasText: email });
    await row.getByTestId("admin-user-edit-btn").first().click();
    await expect(this.editModal()).toBeVisible();
    // Modal pleinement rendu (footer présent) avant toute interaction → évite les races de re-render.
    await expect(
      this.editModal().getByTestId("admin-save-perms-btn"),
    ).toBeVisible();
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

  /**
   * Modifie une cellule de la matrice (toggle `-`/`RO`/`RW`), enregistre, puis rétablit la valeur
   * d'origine en recyclant le toggle (PRM-07).
   */
  async editMatrixAndRestore(): Promise<void> {
    // Le testid `app-perms-select-*` (passé par le parent) écrase `permission-toggle`.
    // On vise un toggle Lecture/Écriture (texte `-` / `RO` / `RW`), pas la case PriorityRestart.
    // Colonne « App » du 1ᵉʳ type d'acteur : un toggle Lecture/Écriture (`-`/`RO`/`RW`).
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

  /** Vérifie qu'on n'est PAS sur la page admin (cas non-admin). */
  async expectAccessDenied(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/administration/);
  }

  // --- Onglet « Batch de données » : synchronisation MAIA (#1825, MAI-04) ---
  async openBatchDataTab(): Promise<void> {
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
}
