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
  /** Un accès bloqué ne présente aucune navigation applicative. */
  async expectMainNavigationAbsent(): Promise<void> {
    await expect(this.mainNav()).toHaveCount(0);
  }
  /** Sans session, le bandeau métier est absent et la déclaration reste dans le footer. */
  async expectPublicNavigationAbsent(): Promise<void> {
    await expect(
      this.page.getByRole("main").getByRole("heading", {
        name: "Le référentiel des applications",
        exact: true,
      }),
    ).toBeVisible();
    await expect(this.mainNav()).toHaveCount(0);
    await expect(
      this.page.getByRole("link", {
        name: "Aller à la navigation",
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      this.footer().getByRole("link", { name: /^Accessibilité/ }),
    ).toBeVisible();
  }

  async expectNavigationShortcut(width: number): Promise<void> {
    await this.page.setViewportSize({ width, height: 900 });
    const shortcut = this.page.getByRole("link", {
      name: "Aller à la navigation",
      exact: true,
    });
    await shortcut.press("Enter");
    if (width >= 992) {
      await expect(this.mainNav().getByRole("link").first()).toBeFocused();
      return;
    }
    const menuButton = this.byTestId("open-menu-btn");
    await expect(menuButton).toBeFocused();
    await menuButton.press("Enter");
    const menu = this.page.getByRole("dialog", { name: "Menu", exact: true });
    await expect(menu).toBeVisible();
    await expect(
      menu.getByRole("button", { name: "Fermer", exact: true }),
    ).toBeFocused();
    await this.page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(menuButton).toBeFocused();
    const homeLink = this.header().getByRole("link").first();
    await homeLink.focus();
    await homeLink.press("Escape");
    await expect(homeLink).toBeFocused();
  }

  async expectPublicSiteMapAndContentShortcut(): Promise<void> {
    await this.footer()
      .getByRole("link", { name: "Plan du site", exact: true })
      .click();
    await expect(this.page).toHaveURL(/\/plan-du-site$/);
    const siteMap = this.byTestId("sitemap-page");
    await expect(
      siteMap.getByRole("heading", { name: "Plan du site", exact: true }),
    ).toBeVisible();
    const links = siteMap.getByRole("link");
    await expect(links).toHaveText(["Accessibilité", "Accueil"]);
    await expect(links.nth(0)).toHaveAttribute("href", "/accessibilite");
    await expect(links.nth(1)).toHaveAttribute("href", "/");
    const contentShortcut = this.page.getByRole("link", {
      name: "Aller au contenu principal",
      exact: true,
    });
    await contentShortcut.focus();
    await expect
      .poll(() =>
        contentShortcut.evaluate((link) => {
          const rect = link.getBoundingClientRect();
          return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= innerHeight &&
            rect.right <= innerWidth
          );
        }),
      )
      .toBe(true);
    await contentShortcut.press("Enter");
    // WebKit macOS suit le réglage système : Option+Tab inclut les liens.
    const tabKey =
      this.page.context().browser()?.browserType().name() === "webkit"
        ? "Alt+Tab"
        : "Tab";
    await this.page.keyboard.press(tabKey);
    await expect(links.nth(0)).toBeFocused();
    await links.nth(0).press("Enter");
    await expect(this.page).toHaveURL(/\/accessibilite$/);
    await expect(
      this.page
        .getByRole("main")
        .getByRole("heading", { name: "Accessibilité", exact: true }),
    ).toBeVisible();
    await this.header().getByRole("link").first().press("Enter");
    await expect(this.page).toHaveURL(/\/$/);
    await expect(
      this.page.getByRole("main").getByRole("heading", {
        name: "Le référentiel des applications",
        exact: true,
      }),
    ).toBeVisible();
    await this.page
      .getByRole("link", { name: "Aller au pied de page", exact: true })
      .press("Enter");
    await this.page.keyboard.press(tabKey);
    await expect(this.footer().getByRole("link").first()).toBeFocused();
  }

  /** Vérifie les vraies destinations publiées, puis compare le gabarit commun. */
  async expectConnectedSiteMapDestinations() {
    const planLink = this.footer().getByRole("link", {
      name: "Plan du site",
      exact: true,
    });
    await planLink.click();
    const siteMap = this.byTestId("sitemap-page");
    await expect(
      siteMap.getByRole("heading", { name: "Espace connecté", exact: true }),
    ).toBeVisible();
    const destinations = await siteMap.getByRole("link").evaluateAll((links) =>
      links.map((link) => ({
        name: link.textContent?.trim() ?? "",
        href: link.getAttribute("href") ?? "",
      })),
    );
    expect(destinations.length).toBeGreaterThan(2);
    expect(
      destinations.every(
        (link) => link.href.startsWith("/") && !link.href.startsWith("/oidc/"),
      ),
    ).toBe(true);
    const expectedMenu = await this.mainNav()
      .getByRole("link")
      .allTextContents();
    const results = [];
    for (const destination of destinations) {
      await siteMap
        .getByRole("link", { name: destination.name, exact: true })
        .click();
      await expect
        .poll(() => new URL(this.page.url()).pathname)
        .toBe(destination.href);
      // Le plan nomme la rubrique « Historique global », tandis que la vue
      // annonce « Modifications - page N » une fois les données chargées.
      const expectedTitle =
        destination.href === "/historique"
          ? /^Modifications - page \d+ - Référentiel des applications$/
          : destination.name;
      await expect(this.byTestId("page-title-announcer")).toContainText(
        expectedTitle,
      );
      await expect(this.mainNav().getByRole("link")).toHaveText(expectedMenu);
      await expect(this.quickSearch()).toBeVisible();
      await expect(planLink).toHaveAttribute("href", "/plan-du-site");
      const structure = await this.page.evaluate(() =>
        [
          ...document.querySelectorAll(
            '[role="banner"], #header-nav, main, [role="contentinfo"]',
          ),
        ].map((element) => element.tagName.toLowerCase()),
      );
      expect(structure).toEqual(["header", "nav", "main", "footer"]);
      results.push({
        ...destination,
        title: await this.page.title(),
        headings: await this.page
          .getByRole("main")
          .getByRole("heading", { level: 1 })
          .allTextContents(),
        structure,
      });
      await planLink.click();
      await expect(siteMap).toBeVisible();
    }
    return results;
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

  /** Le contact Tchap reste accessible depuis le footer et pointe vers un salon. */
  async expectFooterContactTchap(): Promise<void> {
    const contactLink = this.footer().getByRole("link", {
      name: /^Contact Tchap/,
    });
    await expect(contactLink).toBeVisible();
    await expect(contactLink).toHaveAttribute(
      "href",
      /^https:\/\/www\.tchap\.gouv\.fr\/#\/room\/.+/,
    );
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
   * L'état vide est un message visible hors listbox, annoncé également dans un output.
   */
  async expectQuickSearchNoResult(query: string): Promise<void> {
    await this.fillQuickSearch(query);
    await expect(
      this.header()
        .locator("p")
        .filter({ hasText: /^Aucun résultat$/ }),
    ).toBeVisible();
    await expect(this.quickSearchListbox()).toHaveCount(0);
    await expect(this.quickSearch()).toHaveAttribute("aria-expanded", "false");
    await expect(
      this.header().getByRole("status").filter({ hasText: "Aucun résultat" }),
    ).toHaveText("Aucun résultat");
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

  /** Le dialogue mobile isole le fond et boucle le clavier sur ses commandes. */
  async expectMobileSearchFocusCycle(): Promise<void> {
    await this.page.setViewportSize({ width: 320, height: 800 });
    const trigger = this.byTestId("open-search-btn");
    await expect(trigger).toBeVisible();
    await trigger.press("Enter");
    const dialog = this.page.getByRole("dialog", {
      name: "Recherche d’une application",
    });
    const input = dialog.getByRole("combobox");
    const close = dialog.getByRole("button", { name: "Fermer la recherche" });
    await expect(dialog).toBeVisible();
    await expect(input).toBeFocused();
    await input.press("Shift+Tab");
    await expect(close).toBeFocused();
    await close.press("Tab");
    await expect(input).toBeFocused();
    await input.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await this.page
      .getByRole("link", { name: "Aller à la recherche", exact: true })
      .press("Enter");
    await expect(dialog).toBeVisible();
    await expect(input).toBeFocused();
    await input.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
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

  // --- Écran de refus du niveau d'authentification (#1985) ---
  private weakAuthBanner = () => this.byTestId("weak-auth-banner");
  private reauthButton = () => this.byTestId("weak-auth-reauth-btn");

  async expectWeakAuthBanner(text?: string | RegExp): Promise<void> {
    await expect(this.weakAuthBanner()).toBeVisible();
    if (text) await expect(this.weakAuthBanner()).toContainText(text);
  }

  /** Le refus remplace les fonctions du référentiel, même pour un compte administrateur. */
  async expectStrongAuthRequired(text?: string | RegExp): Promise<void> {
    await this.expectWeakAuthBanner(text);
    await expect(this.weakAuthBanner()).toContainText(
      "L'accès au référentiel est bloqué",
    );
    await expect(
      this.weakAuthBanner().getByRole("heading", { level: 1 }),
    ).toBeVisible();
    await this.expectNoAdminLink();
    await this.expectNoProfileLink();
    await this.expectMainNavigationAbsent();
    await this.expectQuickSearchAbsent();
    await expect(this.byTestId("notification-bell-button")).toHaveCount(0);
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
  }

  /**
   * RGA-03 (RGAA 12.8) : le `page-title-announcer` (paragraphe hors-écran, `tabindex="-1"`) doit
   * recevoir le focus après une navigation SPA. On attend l'état DOM avant l'assertion Playwright pour
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
   * RGA-14 (RGAA 9.1) : un seul titre de niveau 1 par page, celui de la vue. Ni l'annonceur
   * ni le titre de service du bandeau ne sont exposés comme titres de niveau 1.
   */
  async reloadPage(): Promise<void> {
    await this.page.reload();
  }

  async expectSingleLevelOneHeading(name: string | RegExp): Promise<void> {
    const levelOne = this.page.getByRole("heading", { level: 1 });
    await expect(levelOne).toHaveCount(1);
    await expect(levelOne).toHaveText(name);
  }

  /**
   * RGA-15 / RGA-16 (RGAA 9.1) : l'annonceur reste un paragraphe hors-écran, jamais un titre,
   * et n'est pas vide, y compris au premier chargement.
   */
  async expectAnnouncerIsNotAnEmptyHeading(): Promise<void> {
    const announcer = this.byTestId("page-title-announcer");
    await expect(announcer).not.toHaveRole("heading");
    await expect(announcer).toHaveText(/\S/);
  }

  /**
   * RGA-04 (RGAA 7.1) : le texte du `page-title-announcer` doit contenir le titre de page attendu
   * (ex. `"Recherche d'applications"`), repris de `document.title` une fois la vue montée.
   */
  async expectAnnouncerText(text: string | RegExp): Promise<void> {
    await expect(this.byTestId("page-title-announcer")).toContainText(text);
  }
}
