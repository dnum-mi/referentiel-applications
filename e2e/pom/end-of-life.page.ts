import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

/**
 * Page Object — Suivi des fins de vie (`/fins-de-vie`, #2236).
 *
 * La page est alimentée par les dates endoflife.date déjà persistées : elle n'affiche donc rien
 * tant qu'aucune technologie du jeu de données n'est concernée. Les assertions distinguent ce cas
 * légitime d'un échec de chargement, plutôt que de présumer des résultats.
 */
export class EndOfLifePage extends BasePage {
  private title = () => this.byTestId("end-of-life-page-title");
  private table = () => this.byTestId("end-of-life-table");
  private empty = () => this.byTestId("end-of-life-empty");
  private status = () => this.byTestId("end-of-life-status");
  private statusFilter = () => this.byTestId("end-of-life-filter-status");
  private clearFilters = () => this.byTestId("end-of-life-clear-filters");

  async open(): Promise<void> {
    await this.goto("/fins-de-vie");
    await expect(this.title()).toBeVisible();
  }

  /** La page a chargé : soit un tableau, soit l'état vide explicite — jamais ni l'un ni l'autre. */
  async expectLoaded(): Promise<void> {
    await expect(this.table().or(this.empty()).first()).toBeVisible();
  }

  /** Le compteur de résultats est restitué aux technologies d'assistance (RGAA 7.5). */
  async expectResultsAnnounced(): Promise<void> {
    await expect(this.status()).toContainText(
      /Résultat \d+ à \d+ sur \d+|Aucune application concernée/,
    );
  }

  /**
   * Applique un filtre de statut et attend le rechargement.
   * On attend la requête plutôt qu'un délai : la liste est débouncée (300 ms).
   */
  async filterByStatus(
    status: "eol" | "eol-soon" | "eoas-passed",
  ): Promise<void> {
    const refetch = this.page
      .waitForResponse(
        (response) =>
          /\/technologies\/end-of-life\?/.test(response.url()) &&
          response.request().method() === "GET",
        { timeout: 10_000 },
      )
      .catch(() => null);
    // Le `data-testid` de `DsfrSelect` atterrit sur le `<select>` lui-même.
    await this.statusFilter().selectOption(status);
    await refetch;
  }

  async clearAllFilters(): Promise<void> {
    await this.clearFilters().click();
  }

  /** Vérifie que l'application `label` est listée, avec le statut attendu sur l'une de ses technologies. */
  async expectApplicationListed(
    label: string,
    statusLabel: string | RegExp,
  ): Promise<void> {
    const row = this.table().locator("tbody tr").filter({ hasText: label });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(statusLabel);
  }

  /**
   * Ouvre la fiche de l'application `label` et vérifie qu'on arrive sur son onglet Stack
   * technique — le trajet qui donne son intérêt à la vue : de la liste vers l'action.
   */
  async openApplicationTechnologyTab(label: string): Promise<void> {
    await this.table()
      .locator("tbody tr")
      .filter({ hasText: label })
      .locator('[data-testid^="end-of-life-row-"]')
      .first()
      .click();
    await expect(this.page).toHaveURL(
      /\/applications\/[^/]+\/tab-technologies/,
    );
  }
}
