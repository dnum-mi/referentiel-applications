import { expect, type Locator, type Page } from "@playwright/test";
import { BASE_URL } from "../support/helpers";

/**
 * Socle commun à tous les Page Objects.
 *
 * POM strict : `byTestId` est **protégé** — il n'est utilisable QUE depuis les Page Objects.
 * Les specs ne doivent jamais manipuler de sélecteur (`data-testid`, rôle, CSS) : elles passent
 * exclusivement par les méthodes sémantiques exposées par chaque page.
 */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  /** Locator par `data-testid` — réservé aux Page Objects (encapsulation des sélecteurs). */
  protected byTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  protected async goto(path: string): Promise<void> {
    await this.page.goto(`${BASE_URL}${path}`);
  }

  /** Attend le toaster applicatif et, optionnellement, vérifie son contenu. */
  async expectToaster(text?: string | RegExp): Promise<void> {
    const toaster = this.byTestId("app-toaster");
    await expect(toaster).toBeVisible();
    if (text) await expect(toaster).toContainText(text);
  }
}
