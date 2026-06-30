import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class CreateApplicationPage extends BasePage {
  private form = () => this.byTestId("application-form");

  /**
   * Textarea du champ Description (MarkdownEditor) — encapsulé ici pour les assertions RGAA.
   * Scoped dans le conteneur `application-description` pour éviter toute ambiguïté si plusieurs
   * MarkdownEditor coexistent sur la page.
   */
  private descriptionTextarea = () =>
    this.byTestId("application-description").locator(
      '[data-testid="markdown-textarea"]',
    );

  async open(): Promise<void> {
    await this.goto("/applications/creer");
    await expect(this.form()).toBeVisible();
  }

  async fillStep1(label: string, description: string): Promise<void> {
    await this.byTestId("application-label").fill(label);
    await this.byTestId("application-shortname").fill(
      label.replace(/\s+/g, "-").toLowerCase(),
    );
    await this.byTestId("application-description")
      .locator('[data-testid="markdown-textarea"]')
      .fill(description);
  }

  private async searchAndSelectOrg(
    labelText: RegExp,
    orgPath: string,
  ): Promise<void> {
    const input = this.page.getByLabel(labelText, { exact: false }).first();
    await input.fill(orgPath.slice(0, 10));
    const selectLabel = this.page.getByLabel(/Choisir une organisation/i);
    const allSelects = await selectLabel.all();
    const sel =
      allSelects.length > 0
        ? allSelects[allSelects.length - 1]
        : selectLabel.first();
    await expect
      .poll(async () => (await sel.locator("option").count()) > 1, {
        timeout: 10000,
      })
      .toBeTruthy();
    const options = sel.locator("option");
    for (let i = 1; i < (await options.count()); i++) {
      const text = await options.nth(i).textContent();
      if (text?.includes(orgPath.slice(0, 5))) {
        const val = await options.nth(i).getAttribute("value");
        if (val) {
          await sel.selectOption(val);
          return;
        }
      }
    }
    const val = await options.nth(1).getAttribute("value");
    if (val) await sel.selectOption(val);
  }

  async fillMoaStep(
    email: string,
    firstname: string,
    lastname: string,
    orgPath: string,
  ): Promise<void> {
    await this.byTestId("application-moa-email").fill(email);
    await this.searchAndSelectOrg(/Organisation MOA/i, orgPath);
    await this.byTestId("application-moa-firstname").fill(firstname);
    await this.byTestId("application-moa-lastname").fill(lastname);
  }

  async fillMoaStepAsGroup(email: string, orgPath: string): Promise<void> {
    await this.byTestId("application-moa-email").fill(email);
    await this.searchAndSelectOrg(/Organisation MOA/i, orgPath);
    await this.byTestId("application-moa-is-group")
      .locator("..")
      .getByText(/entité/i)
      .click();
  }

  async fillMoeStep(
    email: string,
    firstname: string,
    lastname: string,
    orgPath: string,
  ): Promise<void> {
    await this.byTestId("application-moe-email").fill(email);
    await this.searchAndSelectOrg(/Organisation MOE/i, orgPath);
    await this.byTestId("application-moe-firstname").fill(firstname);
    await this.byTestId("application-moe-lastname").fill(lastname);
  }

  async fillMoeStepAsGroup(email: string, orgPath: string): Promise<void> {
    await this.byTestId("application-moe-email").fill(email);
    await this.searchAndSelectOrg(/Organisation MOE/i, orgPath);
    await this.byTestId("application-moe-is-group")
      .locator("..")
      .getByText(/entité/i)
      .click();
  }

  async nextStep(): Promise<void> {
    await this.byTestId("application-next-btn").click();
  }

  async submit(): Promise<void> {
    await this.byTestId("application-submit-btn").click();
  }

  async expectRedirectedToApp(): Promise<void> {
    await expect(this.byTestId("application-profile")).toBeVisible({
      timeout: 15000,
    });
  }

  // --- Assertions RGAA (RGA-01, RGA-02) ---

  /**
   * RGA-02 (RGAA 11.1) : l'attribut `title` du textarea doit correspondre au libellé du champ.
   * Le `MarkdownEditor` reçoit `aria-label="Description"` → `:title="ariaLabel"` → title="Description".
   */
  async expectDescriptionTextareaTitle(expected: string): Promise<void> {
    await expect(this.descriptionTextarea()).toHaveAttribute("title", expected);
  }

  /**
   * RGA-01 (RGAA 12.9) : clique le textarea sans sélectionner de texte puis envoie Tab.
   * Le `handleKeydown` du MarkdownEditor ne consomme Tab que lorsque du texte est sélectionné ;
   * sans sélection le comportement natif est préservé → le focus quitte le champ.
   */
  async focusDescriptionAndPressTab(): Promise<void> {
    await this.descriptionTextarea().click();
    await this.page.keyboard.press("Tab");
  }

  /**
   * RGA-01 (RGAA 12.9) : après `focusDescriptionAndPressTab()`, le textarea ne doit plus être focusé.
   */
  async expectDescriptionTextareaNotFocused(): Promise<void> {
    await expect(this.descriptionTextarea()).not.toBeFocused();
  }
}
