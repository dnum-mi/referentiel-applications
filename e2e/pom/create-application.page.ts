import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class CreateApplicationPage extends BasePage {
  private form = () => this.byTestId("application-form");

  /**
   * Textarea du champ Description (MarkdownEditor) — encapsulé ici pour les assertions RGAA.
   * Scoped dans le conteneur `application-description` pour éviter toute ambiguïté si plusieurs
   * MarkdownEditor coexistent sur la page.
   */
  private descriptionTextarea = () =>
    this.byTestId("application-description").locator(
      '[data-testid="markdown-textarea"]',
    );

  async open(): Promise<void> {
    await this.goto("/applications/creer");
    await expect(this.form()).toBeVisible();
  }

  async fillStep1(label: string, description: string): Promise<void> {
    await this.byTestId("application-label").fill(label);
    await this.byTestId("application-shortname").fill(
      label.replace(/\s+/g, "-").toLowerCase(),
    );
    await this.byTestId("application-description")
      .locator('[data-testid="markdown-textarea"]')
      .fill(description);
  }

  /**
   * Renseigne un `OrganizationSearchSelect` : saisie de la recherche puis choix dans le select.
   *
   * On scope sur le `data-testid` du composant (son `div[role="group"]` racine) plutôt que sur un
   * `getByLabel` global. Deux raisons, toutes deux constatées :
   * - `getByLabel(/Organisation MOA/i).first()` résolvait le bouton « Synchroniser l'organisation
   *   MOA depuis MAIA », ajouté depuis, dont l'`aria-label` contient le même texte ;
   * - le libellé du select (« Choisir une organisation… ») est identique côté MOA et MOE, ce que
   *   l'ancien code contournait en prenant le DERNIER select de la page — fragile dès qu'un
   *   troisième apparaît.
   */
  async fillMoaStep(
    email: string,
    firstname: string,
    lastname: string,
    orgPath: string,
  ): Promise<void> {
    await this.byTestId("application-moa-email").fill(email);
    await this.selectOrganization("application-moa-organization", orgPath);
    await this.byTestId("application-moa-firstname").fill(firstname);
    await this.byTestId("application-moa-lastname").fill(lastname);
  }

  async fillMoaStepAsGroup(email: string, orgPath: string): Promise<void> {
    await this.byTestId("application-moa-email").fill(email);
    await this.selectOrganization("application-moa-organization", orgPath);
    // Ciblage par `name` et non par testid : `DsfrCheckbox` écrase le `data-testid` reçu par le
    // sien (`input-checkbox-{id}`, id aléatoire), donc `application-moa-is-group` n'existe
    // dans aucun élément du DOM. Le libellé, lui, a déjà changé de « groupe » à « entité » et il
    // est porté par deux éléments : le viser par le texte serait ambigu autant que fragile.
    await this.checkDsfrCheckbox(
      this.page.locator('input[type=checkbox][name="moaIsGroup"]'),
    );
  }

  async fillMoeStep(
    email: string,
    firstname: string,
    lastname: string,
    orgPath: string,
  ): Promise<void> {
    await this.byTestId("application-moe-email").fill(email);
    await this.selectOrganization("application-moe-organization", orgPath);
    await this.byTestId("application-moe-firstname").fill(firstname);
    await this.byTestId("application-moe-lastname").fill(lastname);
  }

  async fillMoeStepAsGroup(email: string, orgPath: string): Promise<void> {
    await this.byTestId("application-moe-email").fill(email);
    await this.selectOrganization("application-moe-organization", orgPath);
    // Ciblage par `name` et non par testid : `DsfrCheckbox` écrase le `data-testid` reçu par le
    // sien (`input-checkbox-{id}`, id aléatoire), donc `application-moe-is-group` n'existe
    // dans aucun élément du DOM. Le libellé, lui, a déjà changé de « groupe » à « entité » et il
    // est porté par deux éléments : le viser par le texte serait ambigu autant que fragile.
    await this.checkDsfrCheckbox(
      this.page.locator('input[type=checkbox][name="moeIsGroup"]'),
    );
  }

  /**
   * Passe à l'étape `expected` du formulaire de création (4 étapes : infos, détails, MOA, MOE).
   *
   * L'assertion sur le titre d'étape est indispensable : `nextStep()` côté applicatif ne fait RIEN
   * quand `validateCurrentStep()` échoue, sans lever d'erreur. Sans elle, un champ requis oublié se
   * manifeste vingt secondes plus tard par un timeout sur un champ de l'étape suivante — diagnostic
   * illisible. Ici l'échec pointe l'étape qui n'a pas été franchie.
   */
  async nextStep(expected: 2 | 3 | 4): Promise<void> {
    await this.byTestId("application-next-btn").click();
    await expect(
      this.byTestId(`application-step-title-${expected}`),
    ).toBeVisible();
  }

  async submit(): Promise<void> {
    await this.byTestId("application-submit-btn").click();
  }

  async expectRedirectedToApp(): Promise<void> {
    await expect(this.byTestId("application-profile")).toBeVisible({
      timeout: 15000,
    });
  }

  // --- Assertions RGAA (RGA-01, RGA-02) ---

  /**
   * RGA-02 (RGAA 11.1) : l'attribut `title` du textarea doit correspondre au libellé du champ.
   * Le `MarkdownEditor` reçoit `aria-label="Description"` → `:title="ariaLabel"` → title="Description".
   */
  async expectDescriptionTextareaTitle(expected: string): Promise<void> {
    await expect(this.descriptionTextarea()).toHaveAttribute("title", expected);
  }

  /**
   * RGA-01 (RGAA 12.9) : clique le textarea sans sélectionner de texte puis envoie Tab.
   * Le `handleKeydown` du MarkdownEditor ne consomme Tab que lorsque du texte est sélectionné ;
   * sans sélection le comportement natif est préservé → le focus quitte le champ.
   */
  async focusDescriptionAndPressTab(): Promise<void> {
    await this.descriptionTextarea().click();
    await this.page.keyboard.press("Tab");
  }

  /**
   * RGA-01 (RGAA 12.9) : après `focusDescriptionAndPressTab()`, le textarea ne doit plus être focusé.
   */
  async expectDescriptionTextareaNotFocused(): Promise<void> {
    await expect(this.descriptionTextarea()).not.toBeFocused();
  }
}
