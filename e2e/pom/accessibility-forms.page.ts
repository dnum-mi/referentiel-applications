import { expect } from "@playwright/test";
import {
  expectAriaReferencesResolve,
  expectDialogKeyboardContainment,
  tabKey,
} from "../support/accessibility";
import { BasePage } from "./base.page";

export class AccessibilityFormsPage extends BasePage {
  async expectCreationValidationAndStepFocus(): Promise<void> {
    await this.goto("/applications/creer");
    const form = this.byTestId("application-form");
    const name = this.byTestId("application-label");
    const description = this.byTestId("application-description").getByRole(
      "textbox",
    );
    await expect(form).toBeVisible();
    await expect(name).toHaveAccessibleName(/Nom de l'application/);
    await expect(name).toHaveAttribute("required", "");
    await expect(description).toHaveAccessibleName(/Description/);
    await expect(description).toHaveAttribute("required", "");
    await expect(this.byTestId("required-fields-hint")).toBeVisible();

    await this.byTestId("application-next-btn").press("Enter");
    await expect(name).toBeFocused();
    await expect(name).toHaveAttribute("aria-invalid", "true");
    await expect(name).toHaveAccessibleDescription(
      /Le nom de l'application est obligatoire\./,
    );
    await expect(description).toHaveAttribute("aria-invalid", "true");
    await expect(description).toHaveAccessibleDescription(
      /La description est obligatoire\./,
    );
    await expectAriaReferencesResolve(form);

    await name.fill("E2E A11y brouillon");
    await description.fill(
      "Description conservée pendant la navigation entre étapes.",
    );
    await this.byTestId("application-next-btn").press("Enter");
    const details = this.byTestId("application-step-title-2");
    await expect(details).toBeFocused();
    await expect(details).toHaveText(/Étape 2 sur 4/);
    await this.byTestId("application-previous-btn").press("Enter");
    await expect(this.byTestId("application-step-title-1")).toBeFocused();
    await expect(name).toHaveValue("E2E A11y brouillon");
    await expect(name).not.toHaveAttribute("aria-invalid", "true");
    await expect(description).not.toHaveAttribute("aria-invalid", "true");
  }

  async expectDirtyFormDialogFocus(): Promise<void> {
    await this.goto("/applications/creer");
    const name = this.byTestId("application-label");
    await name.fill("E2E A11y saisie à conserver");
    const cancel = this.byTestId("application-cancel-btn");
    await cancel.press("Enter");
    const dialog = this.page.getByRole("dialog", {
      name: "Annuler la création de l’application",
      exact: true,
    });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAccessibleName(
      "Annuler la création de l’application",
    );
    await expectAriaReferencesResolve(dialog);
    await expectDialogKeyboardContainment(this.page, dialog);
    await this.page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(cancel).toBeFocused();
    await expect(name).toHaveValue("E2E A11y saisie à conserver");
    await cancel.press("Enter");
    await expect(dialog).toBeVisible();
    await dialog
      .getByRole("button", { name: "Reprendre", exact: true })
      .press("Enter");
    await expect(dialog).not.toBeVisible();
    await expect(cancel).toBeFocused();
    await expect(name).toHaveValue("E2E A11y saisie à conserver");
  }

  async expectGristValidationDescriptions(): Promise<void> {
    await this.goto("/profil?tab=grist");
    const settings = this.byTestId("user-grist-settings");
    const url = this.byTestId("user-grist-url-input");
    const key = this.byTestId("user-grist-api-key-input");
    await expect(settings).toBeVisible();
    await expect(url).toHaveAccessibleName(/Adresse de l'instance Grist/);
    await expect(url).toHaveAttribute("aria-required", "true");
    await expect(key).toHaveAttribute("aria-required", "true");
    await url.fill("http://grist.example.invalid");
    await this.byTestId("user-grist-connection-save").press("Enter");
    await expect(url).toBeFocused();
    await expect(url).toHaveAttribute("aria-invalid", "true");
    await expect(url).toHaveAccessibleDescription(
      /Saisissez l'adresse HTTPS de l'instance Grist\./,
    );
    await expect(key).toHaveAttribute("aria-invalid", "true");
    await expect(key).toHaveAccessibleDescription(
      /Saisissez votre clé d'API Grist\./,
    );
    await expectAriaReferencesResolve(settings);

    await url.fill("https://grist.example.invalid");
    await this.byTestId("user-grist-connection-save").press("Enter");
    await expect(url).toHaveAttribute("aria-invalid", "false");
    await expect(key).toBeFocused();
    const document = this.byTestId("user-grist-document-input");
    await document.fill("abc");
    await this.byTestId("user-grist-document-add").press("Enter");
    await expect(document).toBeFocused();
    await expect(document).toHaveAttribute("aria-invalid", "true");
    await expect(document).toHaveAccessibleDescription(/6 à 64 lettres/);
    await expectAriaReferencesResolve(settings);
  }

  async expectHistoryEmptyAnnouncement(): Promise<void> {
    await this.goto("/historique");
    await expect(this.byTestId("history-table")).toBeVisible();
    const announcement = this.byTestId("history-results-status");
    const region = this.byTestId("history-table-region");
    await expect(announcement).toHaveAttribute("aria-live", "polite");
    await expect(announcement).toHaveAttribute("aria-atomic", "true");
    const initialAnnouncement = await announcement.elementHandle();
    if (!initialAnnouncement)
      throw new Error("La zone d'annonce doit précéder l'action");

    await this.byTestId("history-filter-date-from").fill("2099-01-01T00:00");
    await this.byTestId("history-filter-date-to").fill("2099-12-31T23:59");
    await this.byTestId("history-apply-filters").press("Enter");
    await expect(this.byTestId("history-empty")).toHaveText(
      "Aucune donnée recensée.",
    );
    await expect(announcement).toHaveText("0 résultat(s)");
    await expect(region).toBeFocused();
    expect(
      await initialAnnouncement.evaluate((element) => element.isConnected),
    ).toBe(true);
    await this.byTestId("history-clear-filters").press("Enter");
    await expect(this.byTestId("history-table")).toBeVisible();
    await expect(announcement).toHaveText(/[1-9]\d* résultat\(s\)/);
    await expect(region).toBeFocused();
  }

  async expectReportDialogAndErrorAnnouncement(): Promise<void> {
    await this.goto("/recherche-application");
    const trigger = this.byTestId("report-missing-app");
    await expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    await trigger.press("Enter");
    const dialog = this.page.getByRole("dialog", {
      name: "Signaler une application manquante",
      exact: true,
    });
    await expect(dialog).toBeVisible();
    const description = dialog.getByRole("textbox", {
      name: /Décrivez l’application manquante/,
    });
    await expect(description).toHaveAttribute("required", "");
    const alert = dialog
      .locator('[role="alert"][aria-live="assertive"]')
      .first();
    await expect(alert).toBeAttached();
    const initialAlert = await alert.elementHandle();
    if (!initialAlert)
      throw new Error("La zone d'erreur doit être montée avant la validation");
    await expectDialogKeyboardContainment(this.page, dialog);
    await dialog
      .getByRole("button", { name: "Envoyer", exact: true })
      .press("Enter");
    await expect(alert).toContainText("Veuillez décrire votre signalement.");
    expect(await initialAlert.evaluate((element) => element.isConnected)).toBe(
      true,
    );
    await expectAriaReferencesResolve(dialog);
    await description.fill("Brouillon conservé sans créer de signalement.");
    await this.page.keyboard.press(tabKey(this.page));
    await expect(
      dialog.getByRole("button", { name: "Envoyer", exact: true }),
    ).toBeFocused();
    await this.page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  }
}
