import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

/**
 * Page Object — Historique global des modifications (`/historique`, titre « Modifications »).
 * Liste paginée des metadatas avec filtres de dates et accès au détail (« Voir plus »).
 */
export class HistoryPage extends BasePage {
  private heading = () =>
    this.page.getByRole("heading", { name: "Modifications", level: 1 });
  private table = () => this.byTestId("history-table");
  private emptyState = () => this.byTestId("history-empty");
  private rows = () => this.table().locator("tbody tr");
  private dateFrom = () => this.byTestId("history-filter-date-from");
  private dateTo = () => this.byTestId("history-filter-date-to");
  private applyBtn = () => this.byTestId("history-apply-filters");
  private clearBtn = () => this.byTestId("history-clear-filters");
  private seeMore = () => this.byTestId("history-see-more-button");
  private columnHeader = (name: string) =>
    this.table().getByRole("columnheader", { name });

  async open(): Promise<void> {
    await this.goto("/historique");
    await expect(this.heading()).toBeVisible();
  }

  /** La page est chargée : soit la table de modifications, soit l'état vide. */
  async expectLoaded(): Promise<void> {
    await expect(this.table().or(this.emptyState())).toBeVisible();
  }

  /** Au moins une ligne d'historique est présente. */
  async expectHasRows(): Promise<void> {
    await expect(this.table()).toBeVisible();
    await expect(this.rows().first()).toBeVisible();
  }

  /**
   * Restreint l'historique à une période future : aucune modification, l'état vide s'affiche.
   * Démontre que les filtres de dates déclenchent bien un rechargement.
   */
  async filterFuturePeriodExpectEmpty(): Promise<void> {
    await this.dateFrom().fill("2099-01-01T00:00");
    await this.dateTo().fill("2099-12-31T23:59");
    await this.applyBtn().click();
    await expect(this.emptyState()).toBeVisible();
  }

  /** Efface les filtres : l'historique se re-remplit (table de nouveau visible). */
  async clearFiltersExpectRows(): Promise<void> {
    await this.clearBtn().click();
    await expect(this.table()).toBeVisible();
  }

  /** Trie par une colonne et vérifie que la table reste chargée (tri serveur, sans erreur). */
  async sortByColumnExpectReloaded(name: string): Promise<void> {
    await this.columnHeader(name).click();
    await expect(this.table()).toBeVisible();
    await expect(this.rows().first()).toBeVisible();
  }

  /** Ouvre le détail de la première ligne via « Voir plus » et attend la page de détail. */
  async openFirstDetail(): Promise<void> {
    await this.seeMore().first().click();
    await expect(this.page).toHaveURL(/\/metadatas\//);
  }
}

/** Page Object — Détail d'une modification (`/metadatas/:id`). */
export class MetadataDetailPage extends BasePage {
  private heading = () =>
    this.page.getByRole("heading", {
      name: "Détails de la modification",
      level: 1,
    });
  private type = () => this.byTestId("metadata-type");
  private author = () => this.byTestId("metadata-author");
  private date = () => this.byTestId("metadata-date");
  private description = () => this.byTestId("metadata-description");
  private applicationLink = () => this.byTestId("metadata-application-link");
  private backBtn = () => this.byTestId("back-button");
  private error = () => this.byTestId("metadata-error");
  private notFound = () => this.byTestId("metadata-not-found");

  async open(id: string): Promise<void> {
    await this.goto(`/metadatas/${id}`);
  }

  /** Les champs clés du détail sont affichés (type, auteur, date, description). */
  async expectDetailLoaded(): Promise<void> {
    await expect(this.heading()).toBeVisible();
    await expect(this.type()).toBeVisible();
    await expect(this.author()).toBeVisible();
    await expect(this.date()).toBeVisible();
    await expect(this.description()).toBeVisible();
  }

  /** Détail introuvable : message d'erreur ou « non trouvée ». */
  async expectNotFoundOrError(): Promise<void> {
    await expect(this.error().or(this.notFound())).toBeVisible();
  }

  /** Indique si le détail porte un lien vers la fiche application. */
  hasApplicationLink(): Promise<boolean> {
    return this.applicationLink().isVisible();
  }

  /** Suit le lien vers la fiche application et attend la fiche. */
  async openApplicationFromLink(): Promise<void> {
    await this.applicationLink().click();
    await expect(this.page).toHaveURL(/\/applications\//);
  }

  /** Revient à l'historique via le bouton « Retour à l'historique ». */
  async goBackToHistory(): Promise<void> {
    await this.backBtn().click();
    await expect(this.page).toHaveURL(/\/historique/);
  }
}
