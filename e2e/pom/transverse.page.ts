import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

/** Page Object — Plan du site (`/plan-du-site`, `SiteMapPage`). */
export class SiteMapPage extends BasePage {
  private title = () => this.byTestId("sitemap-title");
  private publicLinks = () => this.byTestId("sitemap-public-links");
  private protectedLinks = () => this.byTestId("sitemap-protected-links");

  async open(): Promise<void> {
    await this.goto("/plan-du-site");
    await expect(this.title()).toBeVisible();
  }

  /** La page est chargée : titre + au moins un lien public. */
  async expectLoaded(): Promise<void> {
    await expect(this.title()).toBeVisible();
    await expect(this.publicLinks().getByRole("link").first()).toBeVisible();
  }

  /** Clique un lien de la liste publique et attend l'URL cible. */
  async clickPublicLink(name: string, urlPattern: RegExp): Promise<void> {
    await this.publicLinks().getByRole("link", { name }).click();
    await expect(this.page).toHaveURL(urlPattern);
  }

  /** La section « Espace connecté » et ses liens sont présents (utilisateur authentifié). */
  async expectProtectedSection(): Promise<void> {
    await expect(this.protectedLinks()).toBeVisible();
    await expect(this.protectedLinks().getByRole("link").first()).toBeVisible();
  }
}

/** Page Object — Page Accessibilité (`/accessibilite`, `AccessibilityPage`). */
export class AccessibilityPage extends BasePage {
  private title = () => this.byTestId("accessibility-page-title");

  async open(): Promise<void> {
    await this.goto("/accessibilite");
    await expect(this.title()).toBeVisible();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.title()).toBeVisible();
  }
}

/** Page Object — Page « 404 » non trouvée (`NotFoundPage`). */
export class NotFoundPage extends BasePage {
  private container = () => this.byTestId("not-found-page");
  private homeBtn = () => this.byTestId("not-found-home-btn");

  /** Ouvre une route inconnue (route attrape-tout). */
  async openUnknownRoute(): Promise<void> {
    await this.goto("/cette-page-nexiste-pas-e2e");
  }

  /** La page « non trouvée » s'affiche (404). */
  async expectNotFound(): Promise<void> {
    await expect(this.container()).toBeVisible();
    await expect(this.container()).toContainText(/404|introuvable/i);
  }

  /** Le bouton « Retour à l'accueil » mène au catalogue (utilisateur authentifié). */
  async clickHomeAndExpectCatalogue(): Promise<void> {
    await this.homeBtn().click();
    await expect(this.page).toHaveURL(/\/recherche-application/);
  }
}
