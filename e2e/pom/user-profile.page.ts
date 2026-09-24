import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

/** Page Object — Profil utilisateur & abonnements (`/profil`). */
export class UserProfilePage extends BasePage {
  private root = () => this.byTestId("user-profile");
  private tabs = () => this.byTestId("user-profile-tabs");
  private followPanel = () => this.byTestId("user-profile-tab-follow");
  private unsubscribeButtons = () => this.byTestId("user-unsubscribe-button");

  async open(): Promise<void> {
    await this.goToProfile();
    await expect(this.root()).toBeVisible();
  }

  /** Ouvre l'URL du profil sans présumer que la session a accès au référentiel. */
  async goToProfile(): Promise<void> {
    await this.goto("/profil");
  }

  async openFollowTab(): Promise<void> {
    await this.tabs()
      .getByRole("tab", { name: /Abonnement|Suivi|Follow/i })
      .click();
    await expect(this.followPanel()).toBeVisible();
  }

  async expectFollowTabLoaded(): Promise<void> {
    await expect(this.followPanel()).toBeVisible();
  }

  // --- Niveau d'authentification (#1985) ---
  private tokensPanel = () => this.byTestId("user-profile-tab-tokens");

  async expectNotLoaded(): Promise<void> {
    await expect(this.root()).toHaveCount(0);
    await expect(this.tokensPanel()).toHaveCount(0);
    await expect(this.byTestId("token-create-btn")).toHaveCount(0);
  }

  async hasSubscription(): Promise<boolean> {
    return (await this.unsubscribeButtons().count()) > 0;
  }

  private emailNotif = () =>
    this.byTestId("user-profile-email-notifications-checkbox");

  /**
   * Bascule la préférence de notifications email, vérifie le message de succès, puis rétablit
   * l'état initial (SIG-09). Le toggle DSFR masque l'`<input>` (c'est le `<label>` qui reçoit le clic).
   */
  async toggleEmailNotificationsAndRestore(): Promise<void> {
    const input = () => this.emailNotif().locator("input");
    const initiallyChecked = await input().isChecked();

    // Bascule + vérifie que la préférence est bien enregistrée côté serveur (PATCH /users/me OK).
    await this.setEmailNotif(!initiallyChecked);
    await expect(input()).toBeChecked({ checked: !initiallyChecked });

    // Rétablissement de l'état initial (également persisté).
    await this.setEmailNotif(initiallyChecked);
    await expect(input()).toBeChecked({ checked: initiallyChecked });
  }

  private async setEmailNotif(checked: boolean): Promise<void> {
    const input = this.emailNotif().locator("input");
    if ((await input.isChecked()) === checked) return; // déjà dans l'état voulu

    // On clique le LABEL (élément interactif réel du toggle DSFR) plutôt que l'input masqué
    // (setChecked forcé sur un input caché « did not change its state » par intermittence).
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) =>
          /\/api\/v2\/users\/me\b/.test(r.url()) &&
          r.request().method() === "PATCH",
      ),
      this.emailNotif().locator("label").first().click(),
    ]);
    expect(response.ok()).toBeTruthy();
    await expect(input).toBeChecked({ checked });
  }

  /**
   * Désabonne la première application suivie et vérifie qu'une ligne a disparu.
   * (Le message de succès est une alerte inline, pas le toaster global → on vérifie le décompte.)
   */
  async unsubscribeFirst(): Promise<void> {
    await expect
      .poll(() => this.unsubscribeButtons().count(), { timeout: 10000 })
      .toBeGreaterThan(0);
    const before = await this.unsubscribeButtons().count();
    await this.unsubscribeButtons().first().click();
    await expect(this.unsubscribeButtons()).toHaveCount(before - 1);
  }

  // --- PRF: profil utilisateur (PRF-01 to PRF-09) ---

  async expectProfileInfos(): Promise<void> {
    await expect(this.byTestId("user-profile-table")).toBeVisible();
    await expect(this.byTestId("user-profile-email")).toBeVisible();
    await expect(this.byTestId("user-profile-email")).not.toBeEmpty();
  }

  /** #2593 : ligne « Administrateur » du profil, avec un lien mailto vers l'admin résolu. */
  async expectContactAdmin(): Promise<void> {
    await expect(this.byTestId("user-profile-contact-admin")).toBeVisible();
    await expect(
      this.byTestId("user-profile-contact-admin-link"),
    ).toHaveAttribute("href", /^mailto:.+@.+/);
    await expect(
      this.byTestId("user-profile-contact-admin-source"),
    ).not.toBeEmpty();
  }

  async contactAdminEmail(): Promise<string> {
    return (
      await this.byTestId("user-profile-contact-admin-link").innerText()
    ).trim();
  }

  async expectContactAdminSource(label: string): Promise<void> {
    await expect(
      this.byTestId("user-profile-contact-admin-source"),
    ).toContainText(label);
  }

  /** Un administrateur global n'a personne au-dessus de lui : la ligne est absente. */
  async expectNoContactAdmin(): Promise<void> {
    await this.expectProfileInfos();
    await expect(this.byTestId("user-profile-contact-admin")).toHaveCount(0);
  }

  async profileEmail(): Promise<string> {
    return (await this.byTestId("user-profile-email").innerText()).trim();
  }

  async openTokensTab(): Promise<void> {
    await this.tabs()
      .getByRole("tab", { name: /tokens/i })
      .click();
    await expect(this.tokensPanel()).toBeVisible();
  }

  async expectTokensTabLoaded(): Promise<void> {
    await expect(
      this.page.getByRole("heading", { name: /Tokens applicatifs/i }),
    ).toBeVisible();
  }

  async followedAppCount(): Promise<number> {
    return this.unsubscribeButtons().count();
  }

  async expectFollowedAppsTable(): Promise<void> {
    await expect(this.byTestId("user-followed-apps-table")).toBeVisible();
  }

  async firstFollowedAppLabel(): Promise<string | null> {
    const link = this.byTestId("user-followed-apps-table")
      .locator("a.fr-link")
      .first();
    if (!(await link.isVisible().catch(() => false))) return null;
    return (await link.innerText()).trim();
  }

  async clickFirstFollowedApp(): Promise<void> {
    await this.byTestId("user-followed-apps-table")
      .locator("a.fr-link")
      .first()
      .click();
  }
}
