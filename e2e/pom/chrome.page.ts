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

  // Liste de suggestions et options réelles de la recherche rapide (encapsulées, POM strict).
  private quickSearchListbox = () =>
    this.header().getByRole("listbox", { name: "Applications proposées" });
  private quickSearchOptions = () =>
    this.quickSearchListbox().getByRole("option");

  /** Saisit une requête dans la recherche rapide (déclenche l'autocomplétion débouncée). */
  async fillQuickSearch(query: string): Promise<void> {
    await this.quickSearch().fill(query);
  }

  /**
   * ACC-11 : un préfixe court **non lemmatisé** doit ramener au moins une suggestion.
   * Non-régression du bug FTS : le dictionnaire `french` racinisait « Application » en
   * « appliqu », si bien qu'un préfixe court (« appli ») ne matchait plus ; la recherche
   * préfixe s'appuie désormais sur `document_simple` (dictionnaire `simple`).
   */
  async expectQuickSearchHasSuggestions(query: string): Promise<void> {
    await this.fillQuickSearch(query);
    await expect
      .poll(() => this.quickSearchOptions().count(), { timeout: 10000 })
      .toBeGreaterThan(0);
  }

  /**
   * ACC-15 : après saisie de `query`, une suggestion portant `expectedLabel` est proposée.
   * Plus fort que « au moins une suggestion » : vérifie que l'application ciblée remonte bien.
   */
  async expectQuickSearchSuggestion(
    query: string,
    expectedLabel: string,
  ): Promise<void> {
    await this.fillQuickSearch(query);
    await expect(
      this.quickSearchOptions().filter({ hasText: expectedLabel }).first(),
    ).toBeVisible();
  }

  /**
   * ACC-13 : un terme sans correspondance affiche « Aucun résultat » (état vide de l'autocomplete).
   * On cible le message dans la liste, pas la région `aria-live` (qui porte le même texte).
   */
  async expectQuickSearchNoResult(query: string): Promise<void> {
    await this.fillQuickSearch(query);
    await expect(
      this.quickSearchListbox().getByText("Aucun résultat"),
    ).toBeVisible();
  }

  /** ACC-14 : après saisie, la liste est déployée (`aria-expanded=true`) et visible. */
  async expectQuickSearchExpanded(): Promise<void> {
    await expect(this.quickSearch()).toHaveAttribute("aria-expanded", "true");
    await expect(this.quickSearchListbox()).toBeVisible();
  }

  /**
   * ACC-14 (RGAA 4.1.2) : la flèche bas active la première option — `aria-activedescendant`
   * du combobox la désigne et l'option porte `aria-selected="true"`.
   */
  async quickSearchHighlightFirstOption(): Promise<void> {
    await expect
      .poll(() => this.quickSearchOptions().count(), { timeout: 10000 })
      .toBeGreaterThan(0);
    await this.quickSearch().press("ArrowDown");
    await expect(this.quickSearch()).toHaveAttribute(
      "aria-activedescendant",
      /-item-0$/,
    );
    await expect(this.quickSearchOptions().first()).toHaveAttribute(
      "aria-selected",
      "true",
    );
  }

  /** ACC-14 (RGAA 4.1.2) : Échap referme la liste (`aria-expanded=false`, liste masquée). */
  async quickSearchEscapeCollapses(): Promise<void> {
    await this.quickSearch().press("Escape");
    await expect(this.quickSearch()).toHaveAttribute("aria-expanded", "false");
    await expect(this.quickSearchListbox()).toBeHidden();
  }

  // --- Assertions RGAA (RGA-03, RGA-04) ---

  /**
   * RGA-03 (RGAA 12.8) : navigue vers la page Catalogue via le lien SPA de la nav principale
   * et attend que l'URL reflète la destination. L'`afterEach` du routeur Vue appelle ensuite
   * `pageTitleAnnouncer.value?.focus()` (via `nextTick`), déclenchant le comportement à tester.
   */
  async navigateViaSpaToSearch(): Promise<void> {
    await this.mainNav().getByRole("link", { name: "Applications" }).click();
    await this.page.waitForURL(/recherche-application/);
  }

  // --- Bandeau « niveau d'authentification » (#1985) ---
  private weakAuthBanner = () => this.byTestId("weak-auth-banner");
  private reauthButton = () => this.byTestId("weak-auth-reauth-btn");

  async expectWeakAuthBanner(text?: string | RegExp): Promise<void> {
    await expect(this.weakAuthBanner()).toBeVisible();
    if (text) await expect(this.weakAuthBanner()).toContainText(text);
  }
  /** À appeler après une preuve que `/users/me` est chargé (ex. lien Admin visible). */
  async expectNoWeakAuthBanner(): Promise<void> {
    await expect(this.weakAuthBanner()).toHaveCount(0);
  }
  async expectNoReauthButton(): Promise<void> {
    await expect(this.weakAuthBanner()).toBeVisible();
    await expect(this.reauthButton()).toHaveCount(0);
  }
  async expectReauthButtonLabel(label: string | RegExp): Promise<void> {
    await expect(this.reauthButton()).toHaveText(label);
  }

  /**
   * Première étape (`prompt`) : redirection vers le fournisseur avec `prompt=login`. Le compte de
   * test portant un mode statique, la reconnexion elle-même ne peut pas devenir forte.
   */
  async clickReauth(): Promise<void> {
    await this.reauthButton().click();
    await this.page.waitForURL(/protocol\/openid-connect\/auth.*prompt=login/);
  }

  /**
   * Seconde étape (`logout`) : la session SSO est fermée (appel à l'endpoint de déconnexion du
   * fournisseur), puis l'application relance d'elle-même une connexion avec `prompt=login`.
   */
  async clickReauthViaLogout(): Promise<void> {
    const logoutRequest = this.page.waitForRequest(
      /protocol\/openid-connect\/logout/,
    );
    await this.reauthButton().click();
    await logoutRequest;
    await this.page.waitForURL(/protocol\/openid-connect\/auth.*prompt=login/);
  }

  /**
   * Saisit les identifiants sur la page de connexion du fournisseur puis revient dans
   * l'application. Sur une ré-authentification, Keycloak peut figer l'identifiant : on ne
   * remplit alors que le mot de passe.
   */
  async submitIdentityProviderLogin(user: string, pass: string): Promise<void> {
    const username = this.page
      .locator('#username, #kc-username, input[name="username"]')
      .first();
    if ((await username.isVisible()) && (await username.isEditable())) {
      await username.fill(user);
    }
    await this.page
      .locator('#password, #kc-password, input[name="password"]')
      .first()
      .fill(pass);
    try {
      await Promise.all([
        this.page.waitForURL(
          (url) =>
            !url.toString().includes("/realms/") &&
            !url.toString().includes("/oidc/callback"),
          { timeout: 30000 },
        ),
        this.page
          .locator('#kc-login, button[name="login"], input[type="submit"]')
          .first()
          .click(),
      ]);
    } catch (error) {
      // Firefox peut rester sur /oidc/callback : l'utilisateur est chargé, on rejoint l'accueil.
      if (!this.page.url().includes("/oidc/callback")) throw error;
      await this.goto("/");
    }
  }

  /**
   * RGA-03 (RGAA 12.8) : le `page-title-announcer` (h1 hors-écran, `tabindex="-1"`) doit recevoir
   * le focus après une navigation SPA. On attend l'état DOM avant l'assertion Playwright pour
   * absorber le délai introduit par `nextTick()` dans `router.afterEach`.
   */
  async expectAnnouncerFocused(): Promise<void> {
    await this.page.waitForFunction(
      () =>
        document.activeElement?.getAttribute("data-testid") ===
        "page-title-announcer",
    );
    await expect(this.byTestId("page-title-announcer")).toBeFocused();
  }

  /**
   * RGA-04 (RGAA 7.1) : le texte du `page-title-announcer` doit contenir le titre de page attendu
   * (ex. `"Recherche d'applications"`), fourni via `to.meta.title` par le routeur.
   */
  async expectAnnouncerText(text: string | RegExp): Promise<void> {
    await expect(this.byTestId("page-title-announcer")).toContainText(text);
  }
}
