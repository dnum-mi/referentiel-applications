import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class HomePage extends BasePage {
  async open(): Promise<void> {
    await this.goto("/");
    await expect(this.byTestId("home-title")).toBeVisible();
  }

  async expectTitle(): Promise<void> {
    await expect(this.byTestId("home-title")).toContainText(
      "Le référentiel des applications",
    );
  }

  async expectTiles(): Promise<void> {
    await expect(this.byTestId("home-tile-centralisation")).toBeVisible();
    await expect(this.byTestId("home-tile-access")).toBeVisible();
  }

  async expectContactLink(): Promise<void> {
    await expect(this.byTestId("home-contact-link")).toBeVisible();
  }
}

export class SiteMapPage extends BasePage {
  async open(): Promise<void> {
    await this.goto("/plan-du-site");
    await expect(
      this.page.getByRole("heading", { name: /Plan du site/i }),
    ).toBeVisible();
  }

  async expectPublicPages(): Promise<void> {
    await expect(
      this.page.getByRole("heading", { name: /Pages publiques/i }),
    ).toBeVisible();
  }

  async expectProtectedPages(): Promise<void> {
    await expect(
      this.page.getByRole("heading", { name: /Espace connecté/i }),
    ).toBeVisible();
  }

  async expectLinks(): Promise<void> {
    const links = this.page.locator(".fr-links-group a.fr-link");
    await expect(links.first()).toBeVisible();
    expect(await links.count()).toBeGreaterThan(0);
  }
}

export class AccessibilityPage extends BasePage {
  async open(): Promise<void> {
    await this.goto("/accessibilite");
    await expect(this.byTestId("accessibility-page")).toBeVisible();
  }

  async expectTitle(): Promise<void> {
    await expect(this.byTestId("accessibility-page-title")).toContainText(
      "Accessibilité",
    );
  }
}

export class NotFoundPage extends BasePage {
  async open(): Promise<void> {
    await this.goto("/route-qui-nexiste-pas-e2e-test");
    await expect(this.byTestId("not-found-page")).toBeVisible();
  }

  async expectErrorMessage(): Promise<void> {
    await expect(this.byTestId("not-found-error")).toBeVisible();
  }

  async expectHomeButton(): Promise<void> {
    await expect(this.byTestId("not-found-home-btn")).toBeVisible();
  }
}

export class ReportsListPage extends BasePage {
  async open(): Promise<void> {
    await this.goto("/signalements");
    await expect(this.byTestId("reports-page")).toBeVisible();
  }

  async expectTitle(): Promise<void> {
    await expect(this.byTestId("reports-page-title")).toContainText(
      "Signalements",
    );
  }

  async expectTabs(): Promise<void> {
    await expect(this.byTestId("reports-tabs")).toBeVisible();
  }

  async expectContentLoaded(): Promise<void> {
    await expect(
      this.byTestId("issues-search-bar")
        .or(this.page.getByText(/Aucun signalement/i))
        .first(),
    ).toBeVisible({ timeout: 15000 });
  }
}
