import { expect } from "@playwright/test";
import type { AppRef } from "../fixtures/datafeature";
import { BasePage } from "./base.page";

/** Navigation inter-fiches par le bandeau : conserve la même instance Pinia. */
export class RelationNavigationPage extends BasePage {
  async open(app: AppRef): Promise<void> {
    await this.goto(`/applications/${app.id}/tab-relations`);
    await expect(this.byTestId("application-profile")).toBeVisible();
    await expect(
      this.page.getByRole("tab", { name: "Relations", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
  }

  async navigate(app: AppRef): Promise<void> {
    await this.page
      .getByRole("combobox", { name: "Recherche d’une application" })
      .fill(app.label);
    const suggestions = this.page.getByRole("listbox", {
      name: "Applications proposées",
    });
    await suggestions
      .getByRole("option")
      .filter({ hasText: app.label })
      .click();
    await expect(this.page).toHaveURL(
      new RegExp(`/applications/${app.id}(?:/|$)`),
    );
    await expect(this.byTestId("application-profile")).toBeVisible();
    await this.page
      .getByRole("tab", { name: "Relations", exact: true })
      .click();
    await expect(this.page).toHaveURL(
      new RegExp(`/applications/${app.id}/tab-relations$`),
    );
  }

  /** Laisser Vue peindre après réception complète de la réponse retenue. */
  async settleRendering(): Promise<void> {
    await this.page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
  }

  async expectOnlyRelation(label: string): Promise<void> {
    const links = this.byTestId("relations-table").getByTestId(
      "relation-target-link",
    );
    await expect(links).toHaveCount(1);
    await expect(links).toHaveText([label]);
  }

  async expectRelationAbsent(label: string): Promise<void> {
    await expect(
      this.byTestId("relations-table").getByText(label, { exact: true }),
    ).toHaveCount(0);
  }

  async expectEmptyWithoutActions(): Promise<void> {
    await expect(this.byTestId("relations-empty")).toBeVisible();
    await expect(this.byTestId("relations-table")).toHaveCount(0);
    await expect(this.byTestId("relation-edit-btn")).toHaveCount(0);
    await expect(this.byTestId("relation-delete-selected-btn")).toBeDisabled();
  }
}
