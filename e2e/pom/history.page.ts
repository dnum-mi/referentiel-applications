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
  private pagination = () => this.byTestId("pagination-component");
  private pageLink = (n: string) =>
    this.pagination().getByRole("link", { name: n, exact: true });

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

  /** Vérifie que la première ligne de l'historique contient le texte attendu. */
  async expectFirstRowContains(text: string | RegExp): Promise<void> {
    await expect(this.rows().first()).toContainText(text);
  }

  /** Ouvre le détail de la première ligne via « Voir plus » et attend la page de détail. */
  async openFirstDetail(): Promise<void> {
    await this.seeMore().first().click();
    await expect(this.page).toHaveURL(/\/metadatas\//);
  }

  /** Indique si une 2ᵉ page d'historique est proposée par la pagination. */
  async hasSecondPage(): Promise<boolean> {
    return (await this.pageLink("2").count()) > 0;
  }

  /** Va à la page 2 de l'historique et vérifie qu'elle devient la page courante. */
  async goToSecondPage(): Promise<void> {
    await this.pageLink("2").click();
    await expect(this.pageLink("2")).toHaveAttribute("aria-current", "page");
    await expect(this.rows().first()).toBeVisible();
  }
}

/** Page Object — Détail d'une modification (`/metadatas/:id`). */
export class MetadataDetailPage extends BasePage {
  private heading = () =>
    // exact: true exclut le `page-title-announcer` sr-only (RGAA 7.1), dont le nom accessible
    // "Détails de la modification - Référentiel des applications" contient ce titre en préfixe.
    this.page.getByRole("heading", {
      name: "Détails de la modification",
      level: 1,
      exact: true,
    });
  private type = () => this.byTestId("metadata-type");
  private author = () => this.byTestId("metadata-author");
  private date = () => this.byTestId("metadata-date");
  private description = () => this.byTestId("metadata-description");
  private applicationLink = () => this.byTestId("metadata-application-link");
  private backBtn = () => this.byTestId("back-button");
  private error = () => this.byTestId("metadata-error");
  private notFound = () => this.byTestId("metadata-not-found");
  // Pas de testid dédié pour ce sous-bloc : recherche par classe scopée à `metadata-description`
  // (pattern déjà employé pour `app-perms-table`, cf. `AdminPage.expectPermsMatrixLegendVisible`).
  private descriptionDetails = () =>
    this.description().locator(".description-details");
  private descriptionDetailLines = () =>
    this.descriptionDetails().locator(".detail-line");

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

  /** Vérifie que la description contient le texte attendu. */
  async expectDescriptionContains(text: string | RegExp): Promise<void> {
    await expect(this.description()).toContainText(text);
  }

  /**
   * Description mono-ligne (pas de saut de ligne) : le sous-bloc `description-details` ne doit
   * pas être présent dans `metadata-description` (HIS-12).
   */
  async expectDescriptionDetailsHidden(): Promise<void> {
    await expect(this.description()).toBeVisible();
    await expect(this.descriptionDetails()).toHaveCount(0);
  }

  /**
   * Description multi-ligne : le sous-bloc `description-details` est présent avec au moins une
   * `.detail-line` (HIS-12).
   */
  async expectDescriptionDetailsVisible(): Promise<void> {
    await expect(this.descriptionDetails()).toBeVisible();
    await expect(this.descriptionDetailLines().first()).toBeVisible();
  }

  /** Revient à l'historique via le bouton « Retour à l'historique ». */
  async goBackToHistory(): Promise<void> {
    await this.backBtn().click();
    await expect(this.page).toHaveURL(/\/historique/);
  }
}
