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

  /** La section « Usage dans l'application » est affichée. */
  async expectUsageSection(): Promise<void> {
    await expect(
      this.page.getByRole("heading", { name: "Usage dans l'application" }),
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

  // --- Édition / détachement depuis la page de détail (DAT-11, DAT-12) ---

  /** Ouvre le modal d'édition de la donnée depuis la page de détail (DAT-11). */
  async openEdit(): Promise<void> {
    await this.byTestId("data-application-detail-edit-btn").click();
    await expect(this.byTestId("data-application-modal")).toBeVisible();
  }

  /** Soumet le modal d'édition déjà ouvert (DAT-11). */
  async submitEdit(): Promise<void> {
    await this.byTestId("data-application-submit-btn").click();
    await this.expectToaster(/succès/i);
  }

  /** Valeur actuellement sélectionnée du select statut open data, modal d'édition déjà ouvert (DAT-11). */
  currentOpenDataStatusValue(): Promise<string> {
    return this.byTestId("data-application-open-data-select").inputValue();
  }

  /**
   * Rouvre le modal d'édition et applique un statut open data donné (par sa valeur d'option) — sert
   * à restaurer l'état initial en `finally` (DAT-11).
   */
  async setOpenDataStatus(value: string): Promise<void> {
    await this.openEdit();
    await this.byTestId("data-application-open-data-select").selectOption(
      value,
    );
    await this.submitEdit();
  }

  /**
   * Sélectionne, dans le modal d'édition déjà ouvert, un statut open data DIFFÉRENT de la valeur
   * actuelle et renvoie `{ value, label }`. L'énumération `OpenDataStatus` est fixe (3 valeurs +
   * placeholder « Non renseigné ») : une alternative existe toujours — DAT-11.
   */
  async selectDifferentOpenDataStatus(): Promise<{
    value: string;
    label: string;
  }> {
    const select = this.byTestId("data-application-open-data-select");
    const current = await select.inputValue();
    const options = await select.locator("option").evaluateAll(
      (els, exclude) =>
        els
          .map((el) => ({
            value: (el as HTMLOptionElement).value,
            label: (el.textContent ?? "").trim(),
          }))
          .filter((o) => o.value !== "" && o.value !== exclude),
      current,
    );
    if (!options.length) {
      throw new Error(
        "Aucune alternative de statut open data disponible (énumération fixe attendue)",
      );
    }
    const [chosen] = options;
    await select.selectOption(chosen.value);
    return chosen;
  }

  /**
   * La section « Usage dans l'application » affiche `label`. Pas de `data-testid` dédié côté app
   * pour ce conteneur : on remonte au parent immédiat de son titre (`heading`), seul repère stable
   * exposé (DAT-11).
   */
  async expectUsageOpenDataStatus(label: string): Promise<void> {
    const section = this.page
      .getByRole("heading", { name: "Usage dans l'application" })
      .locator("..");
    await expect(section).toContainText(label);
  }

  // --- Usage dans l'application : application utilisatrice + applications sources (DAT-16) ---

  /** Le tag « application utilisant cette donnée » affiche `label` (DAT-16). */
  async expectUsageApplication(label: string): Promise<void> {
    await expect(
      this.byTestId("data-application-detail-usage-application"),
    ).toContainText(label);
  }

  /** Clique le tag « application utilisant cette donnée », qui redirige vers sa fiche (DAT-16). */
  async clickUsageApplication(): Promise<void> {
    await this.byTestId("data-application-detail-usage-application").click();
  }

  /** La liste des applications sources affiche `label` en tag cliquable (DAT-16). */
  async expectSourceApplication(label: string): Promise<void> {
    await expect(
      this.byTestId("data-application-detail-source-applications"),
    ).toContainText(label);
  }

  /** Clique le tag application source `label`, qui redirige vers sa fiche (DAT-16). */
  async clickSourceApplication(label: string): Promise<void> {
    await this.byTestId("data-application-detail-source-applications")
      .locator(".fr-tag", { hasText: label })
      .click();
  }

  /** La navigation a redirigé vers la fiche de l'application `applicationId` (DAT-16). */
  async expectOnApplicationProfile(applicationId: string): Promise<void> {
    await expect(this.page).toHaveURL(
      new RegExp(`/applications/${applicationId}(?:/|$)`),
    );
  }

  /** Détache la donnée depuis la page de détail et confirme le modal DSFR (DAT-12). */
  async deleteFromDetail(): Promise<void> {
    await this.byTestId("data-application-detail-delete-btn").click();
    await expect(this.byTestId("delete-confirmation-modal")).toBeVisible();
    await this.byTestId("delete-confirm-btn").click();
  }

  /** Après détachement, la page redirige vers l'onglet Données de la fiche application (DAT-12). */
  async expectRedirectedToDataTab(applicationId: string): Promise<void> {
    await expect(this.page).toHaveURL(
      new RegExp(`/applications/${applicationId}/tab-data`),
    );
  }
}
