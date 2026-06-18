import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

/**
 * Page Object — Chrome global (header, navigation principale, recherche rapide) défini dans `App.vue`.
 * `DsfrHeader` duplique son `data-testid` (header + lien interne) et n'expose pas de testid par
 * quick-link/item → on cible par **rôles sémantiques** (`banner`, `navigation "Menu principal"`,
 * `combobox`) et par libellé accessible, encapsulés ici (POM strict).
 */
export class ChromePage extends BasePage {
  private header = () => this.page.getByRole("banner");
  private mainNav = () =>
    this.page.getByRole("navigation", { name: "Menu principal" });
  private quickLink = (name: string) =>
    this.header().getByRole("link", { name });
  private quickSearch = () => this.header().getByRole("combobox");
  private footer = () => this.page.getByRole("contentinfo");

  /** Ouvre la page d'accueil (porteuse du chrome global). */
  async open(): Promise<void> {
    await this.goto("/");
    await expect(this.header()).toBeVisible();
  }

  // --- Présence des raccourcis du bandeau (assertions auto-attendues) ---
  async expectSignInLink(): Promise<void> {
    await expect(this.quickLink("Se connecter")).toBeVisible();
  }
  async expectNoSignInLink(): Promise<void> {
    await expect(this.quickLink("Se connecter")).toHaveCount(0);
  }
  async expectProfileLink(): Promise<void> {
    await expect(this.quickLink("Mon profil")).toBeVisible();
  }
  async expectNoProfileLink(): Promise<void> {
    await expect(this.quickLink("Mon profil")).toHaveCount(0);
  }
  async expectLogoutLink(): Promise<void> {
    await expect(this.quickLink("Déconnexion")).toBeVisible();
  }
  async expectNoLogoutLink(): Promise<void> {
    await expect(this.quickLink("Déconnexion")).toHaveCount(0);
  }
  async expectAdminLink(): Promise<void> {
    await expect(this.quickLink("Admin")).toBeVisible();
  }
  async expectNoAdminLink(): Promise<void> {
    await expect(this.quickLink("Admin")).toHaveCount(0);
  }

  // --- Navigation principale ---
  async expectMainNavigationVisible(): Promise<void> {
    await expect(this.mainNav()).toBeVisible();
  }
  /** En mode public, la navigation principale n'est pas rendue. */
  async expectMainNavigationAbsent(): Promise<void> {
    await expect(this.mainNav()).toHaveCount(0);
  }
  async expectNavItem(label: string): Promise<void> {
    await expect(
      this.mainNav().getByRole("link", { name: label }),
    ).toBeVisible();
  }

  /** Clique un item de la navigation principale et attend l'URL cible. */
  async clickNavItem(label: string, urlPattern: RegExp): Promise<void> {
    await this.mainNav().getByRole("link", { name: label }).click();
    await expect(this.page).toHaveURL(urlPattern);
  }

  // --- Footer ---
  async expectFooterVisible(): Promise<void> {
    await expect(this.footer()).toBeVisible();
  }

  /** Un lien du footer (par nom accessible) est présent. */
  async expectFooterLink(name: string | RegExp): Promise<void> {
    await expect(this.footer().getByRole("link", { name })).toBeVisible();
  }

  // --- Recherche rapide du header ---
  /** En mode public, la recherche rapide n'est pas rendue. */
  async expectQuickSearchAbsent(): Promise<void> {
    await expect(this.quickSearch()).toHaveCount(0);
  }

  /**
   * Saisit une requête, attend la liste de suggestions et ouvre la fiche de la première suggestion
   * réelle (hors option désactivée « Aucun résultat »).
   */
  async quickSearchToFiche(query: string): Promise<void> {
    await this.quickSearch().fill(query);
    const option = this.page
      .getByRole("listbox", { name: "Applications proposées" })
      .getByRole("option")
      .filter({ hasNotText: "Aucun résultat" })
      .first();
    await option.click();
    await expect(this.page).toHaveURL(/\/applications\/[^/]+/);
  }
}
