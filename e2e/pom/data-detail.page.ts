import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

/**
 * Page Object — Détail d'une donnée applicative
 * (`/applications/:applicationId/data/:dataApplicationId`, `DataApplicationDetail`).
 */
export class DataDetailPage extends BasePage {
  private container = () => this.byTestId("data-application-detail");
  private name = () => this.byTestId("data-application-detail-name");
  private notFound = () => this.byTestId("data-application-detail-not-found");
  private back = () => this.byTestId("data-application-detail-back");

  async open(applicationId: string, dataApplicationId: string): Promise<void> {
    await this.goto(`/applications/${applicationId}/data/${dataApplicationId}`);
    await expect(this.container()).toBeVisible();
  }

  /** Le détail est chargé : conteneur + nom de la donnée + section « Informations de la donnée ». */
  async expectLoaded(): Promise<void> {
    await expect(this.container()).toBeVisible();
    await expect(this.name()).toBeVisible();
    await expect(
      this.page.getByRole("heading", { name: "Informations de la donnée" }),
    ).toBeVisible();
  }

  /** Donnée introuvable : l'alerte « Donnée introuvable » s'affiche. */
  async expectNotFound(): Promise<void> {
    await expect(this.notFound()).toBeVisible();
  }

  /** Le bouton « Retour à la liste » revient sur la fiche application. */
  async goBackToFiche(applicationId: string): Promise<void> {
    await this.back().click();
    await expect(this.page).toHaveURL(
      new RegExp(`/applications/${applicationId}(?:/|$)`),
    );
  }
}
