import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

/** Page Object — Signalements (`/signalements`). */
export class ReportsPage extends BasePage {
  private root = () => this.byTestId("reports-page");
  private tabs = () => this.byTestId("reports-tabs");
  // Les deux onglets (mes / tous) rendent chacun leur table : on scope au panneau « Mes signalements »
  // (actif par défaut) pour éviter les doublons en mode strict.
  private panel = () => this.byTestId("reports-tab-content-tab-my-reports");
  private table = () => this.panel().getByTestId("issues-table");
  private emptyMessage = () =>
    this.panel().getByText(/Aucun signalement recensé/i);
  private searchBar = () => this.panel().getByTestId("issues-search-bar");

  async open(): Promise<void> {
    await this.goto("/signalements");
    await expect(this.root()).toBeVisible();
  }

  /**
   * Tente d'ouvrir la page alors que la fonctionnalité est désactivée (feature
   * flag off) : la garde de route doit rediriger vers l'accueil.
   */
  async openExpectingRedirectToHome(): Promise<void> {
    await this.goto("/signalements");
    await expect.poll(() => new URL(this.page.url()).pathname).toBe("/");
  }

  /** La page est chargée si les onglets sont là + soit la table, soit l'état vide. */
  async expectListLoaded(): Promise<void> {
    await expect(this.tabs()).toBeVisible();
    await expect(this.table().or(this.emptyMessage()).first()).toBeVisible();
  }

  async search(value: string): Promise<void> {
    // `issues-search-bar` est un <form> : on remplit l'<input> à l'intérieur.
    await this.searchBar().locator("input").fill(value);
  }

  /** Vérifie que la table contient une ligne avec ce texte (après recherche). */
  async expectRowContaining(text: string): Promise<void> {
    await expect(this.table()).toContainText(text);
  }

  /** Passe la table en mode édition (contributeur+). */
  async enterEditMode(): Promise<void> {
    await this.panel()
      .getByRole("button", { name: /^Modifier$/ })
      .first()
      .click();
  }

  /**
   * Change le statut du 1ᵉʳ signalement affiché (mode édition) et vérifie la prise en compte.
   * En édition, le select de statut n'a pas de testid : on cible le `<select>` de la ligne.
   */
  async changeFirstReportStatus(): Promise<void> {
    const select = this.table().locator("select").first();
    await expect(select).toBeVisible();
    const values = await select
      .locator("option")
      .evaluateAll((opts) =>
        opts.map((o) => (o as HTMLOptionElement).value).filter(Boolean),
      );
    const current = await select.inputValue();
    const next = values.find((v) => v !== current) ?? values[0];
    await select.selectOption(next);
    await expect(select).toHaveValue(next);
  }
}
