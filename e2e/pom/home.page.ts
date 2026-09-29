import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

/** Page Object — Page d'accueil publique (`/`, `HomePage`). */
export class HomePage extends BasePage {
  private title = () => this.byTestId("home-title");
  private objectivesTitle = () => this.byTestId("home-objectives-title");
  private betaTitle = () =>
    this.page.getByRole("heading", { name: "Envie de devenir beta testeur ?" });
  private betaContactLink = () =>
    this.page.getByRole("link", { name: /Contacter l’équipe sur Tchap/ });
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

  /** L'invitation obsolète à devenir beta testeur et son lien dédié sont absents. */
  async expectBetaSectionAbsent(): Promise<void> {
    await expect(this.betaTitle()).toHaveCount(0);
    await expect(this.betaContactLink()).toHaveCount(0);
  }
}
