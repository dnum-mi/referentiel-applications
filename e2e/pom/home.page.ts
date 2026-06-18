import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

/** Page Object — Page d'accueil publique (`/`, `HomePage`). */
export class HomePage extends BasePage {
  private title = () => this.byTestId("home-title");
  private objectivesTitle = () => this.byTestId("home-objectives-title");
  private betaTitle = () => this.byTestId("home-beta-title");
  private contactLink = () => this.byTestId("home-contact-link");
  private readonly tileTestIds = [
    "home-tile-centralisation",
    "home-tile-access",
    "home-tile-dependencies",
    "home-tile-maintenance",
    "home-tile-exploitability",
  ];

  async open(): Promise<void> {
    await this.goto("/");
    await expect(this.title()).toBeVisible();
  }

  /** Atteint la home sans être redirigé vers Keycloak (page publique, `requiresAuth: false`). */
  async openExpectingPublicAccess(): Promise<void> {
    await this.goto("/");
    await expect(this.title()).toBeVisible();
    await expect(this.page).not.toHaveURL(/\/realms\//);
  }

  /** La section Objectifs et ses 5 tuiles sont visibles. */
  async expectObjectivesWithAllTiles(): Promise<void> {
    await expect(this.objectivesTitle()).toBeVisible();
    for (const id of this.tileTestIds) {
      await expect(this.byTestId(id)).toBeVisible();
    }
  }

  /** La section « beta testeur » est visible. */
  async expectBetaSectionVisible(): Promise<void> {
    await expect(this.betaTitle()).toBeVisible();
  }

  /** `href` du lien de contact (la spec vérifie qu'il pointe vers Tchap). */
  contactLinkHref(): Promise<string | null> {
    return this.contactLink().getAttribute("href");
  }
}
