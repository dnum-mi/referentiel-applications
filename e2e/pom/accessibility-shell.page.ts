import { expect, type Locator } from "@playwright/test";
import { expectAriaReferencesResolve, tabKey } from "../support/accessibility";
import { BasePage } from "./base.page";

/** Gabarit, accès rapides et onglets réels ; aucune réponse API n'est remplacée. */
export class AccessibilityShellPage extends BasePage {
  private header = () => this.page.getByRole("banner");
  private main = () => this.page.getByRole("main");
  private footer = () => this.page.getByRole("contentinfo");
  private profileTabs = () =>
    this.main().getByRole("tablist", { name: "Profil utilisateur" });

  async useWidth(width: number): Promise<void> {
    await this.page.setViewportSize({ width, height: 900 });
  }

  async openPublicHome(): Promise<void> {
    await this.goto("/");
    await expect(
      this.header().getByRole("link", { name: "Se connecter", exact: true }),
    ).toBeVisible();
  }

  private async expectHomeStructure(): Promise<void> {
    for (const landmark of [this.header(), this.main(), this.footer()]) {
      await expect(landmark).toHaveCount(1);
      await expect(landmark).toBeVisible();
    }
    const heading = this.page.getByRole("heading", { level: 1 });
    await expect(heading).toHaveCount(1);
    await expect(heading).toHaveAccessibleName(
      "Le référentiel des applications",
    );
    await expect(heading).toMatchAriaSnapshot(
      '- heading "Le référentiel des applications" [level=1]',
    );
    await expect(this.header().locator(".fr-logo")).toMatchAriaSnapshot(
      "- paragraph: Ministère de l'intérieur Liberté, égalité, fraternité",
    );
    const order = await this.header()
      .or(this.main())
      .or(this.footer())
      .evaluateAll((landmarks) =>
        landmarks.map((landmark) => landmark.tagName.toLowerCase()),
      );
    expect(order).toEqual(["header", "main", "footer"]);
    await expectAriaReferencesResolve(this.header());
    await expectAriaReferencesResolve(this.footer());
  }

  async expectPublicReadingStructure(): Promise<void> {
    await this.expectHomeStructure();
    await expect(
      this.page.getByRole("navigation", { name: "Menu principal" }),
    ).toHaveCount(0);
    await expect(this.page.getByRole("navigation", { name: "Accès rapide" }))
      .toMatchAriaSnapshot(`
      - navigation "Accès rapide":
        - list:
          - listitem:
            - link "Aller au contenu principal"
          - listitem:
            - link "Aller au pied de page"
    `);
  }

  async expectConnectedReadingStructure(): Promise<void> {
    await expect(
      this.header().getByRole("link", { name: "Mon profil", exact: true }),
    ).toBeVisible();
    await this.expectHomeStructure();
    const navigation = this.page.getByRole("navigation", {
      name: "Menu principal",
    });
    await expect(navigation).toHaveCount(1);
    await expect(navigation).toBeVisible();
    await expect(
      navigation.getByRole("link", { name: "Applications", exact: true }),
    ).toBeVisible();
    const order = await this.header()
      .or(navigation)
      .or(this.main())
      .or(this.footer())
      .evaluateAll((landmarks) =>
        landmarks.map((landmark) => landmark.tagName.toLowerCase()),
      );
    expect(order).toEqual(["header", "nav", "main", "footer"]);
  }

  async expectFooterLinksDescribeTheirAction(): Promise<void> {
    const footer = this.footer();
    const requiredExternalLinks = [
      "Cadre de Cohérence Technique (CCT) - nouvelle fenêtre",
      "Code source - nouvelle fenêtre",
      "Api du référentiel - nouvelle fenêtre",
      "Contact Tchap - nouvelle fenêtre",
      "licence etalab-2.0 - nouvelle fenêtre",
    ];
    for (const name of requiredExternalLinks) {
      const link = footer.getByRole("link", { name, exact: true });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link.locator(".fr-sr-only")).toContainText(
        "nouvelle fenêtre",
      );
    }
    await expect(
      footer.getByRole("link", {
        name: /^Version : .+ sur GitHub \(nouvelle fenêtre\)$/,
      }),
    ).toHaveAttribute("target", "_blank");

    for (const link of await footer.locator('a[target="_blank"]').all()) {
      await expect(link).toHaveAccessibleName(/nouvelle fenêtre/);
      const rel = (await link.getAttribute("rel"))?.split(/\s+/) ?? [];
      expect(rel).toEqual(expect.arrayContaining(["noopener", "noreferrer"]));
    }

    const contact = footer.getByRole("link", {
      name: "Contacter l'équipe",
      exact: true,
    });
    await expect(contact).toHaveAttribute(
      "href",
      "mailto:support-referentiel-applications@interieur.gouv.fr",
    );
    await expect(contact).not.toHaveAttribute("target");
    await expect(contact).not.toHaveAttribute("rel");
    await expect(contact).not.toHaveAccessibleDescription(/nouvelle fenêtre/);

    const titles = await footer.locator("a[title]").evaluateAll((links) =>
      links.map((link) => {
        const content = link.cloneNode(true) as HTMLElement;
        content
          .querySelectorAll('.fr-sr-only, [aria-hidden="true"]')
          .forEach((hidden) => hidden.remove());
        const visibleName = (
          content.textContent?.trim() ||
          content.querySelector("img")?.getAttribute("alt") ||
          ""
        ).replace(/\s+/g, " ");
        return { visibleName, title: link.getAttribute("title") ?? "" };
      }),
    );
    expect(titles.length).toBeGreaterThan(0);
    for (const { visibleName, title } of titles) {
      expect(
        visibleName,
        `Intitulé absent pour le titre « ${title} »`,
      ).not.toBe("");
      expect(title.startsWith(visibleName), `${visibleName} : ${title}`).toBe(
        true,
      );
    }
  }

  /** Parcourt réellement la séquence de tabulation ; aucun focus n'est imposé. */
  private async tabTo(
    target: Locator,
    direction: "forward" | "backward" = "forward",
  ): Promise<void> {
    await expect(target).toHaveCount(1);
    const limit = 60;
    const key = `${direction === "backward" ? "Shift+" : ""}${tabKey(this.page)}`;
    for (let step = 0; step < limit; step += 1) {
      await this.page.keyboard.press(key);
      if (
        await target.evaluate((element) => element === document.activeElement)
      ) {
        await expect(target).toBeFocused();
        return;
      }
    }
    await expect(
      target,
      `La commande reste inaccessible après ${limit} tabulations réelles`,
    ).toBeFocused();
  }

  async followContentShortcutAndPublicSpaLink(): Promise<void> {
    await this.goto("/plan-du-site");
    await expect(
      this.main().getByRole("heading", { name: "Plan du site", exact: true }),
    ).toBeVisible();
    const shortcut = this.page.getByRole("link", {
      name: "Aller au contenu principal",
      exact: true,
    });
    // Le montage SPA peut avoir focalisé l'annonceur situé après l'en-tête :
    // Maj+Tab rejoint les accès rapides sans passer par l'interface du navigateur.
    await this.tabTo(shortcut, "backward");
    await expect(shortcut).toBeInViewport({ ratio: 1 });
    await expect(shortcut).toHaveAttribute("href", "#main-content");
    await this.page.keyboard.press("Enter");
    await this.page.keyboard.press(tabKey(this.page));
    const firstContentLink = this.main().getByRole("link", {
      name: "Accessibilité",
      exact: true,
    });
    await expect(firstContentLink).toBeFocused();
    await this.page.keyboard.press("Enter");
    await expect(this.page).toHaveURL(/\/accessibilite$/);
    await expect(this.page).toHaveTitle(
      "Accessibilité - Référentiel des applications",
    );
    const announcer = this.byTestId("page-title-announcer");
    await expect(announcer).toBeFocused();
    await expect(announcer).toHaveText(
      "Accessibilité - Référentiel des applications",
    );
    await expect(announcer).not.toHaveRole("heading");
    await expect(this.page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(
      this.main().getByRole("heading", { level: 1 }),
    ).toHaveAccessibleName("Accessibilité");
    if ((this.page.viewportSize()?.width ?? 1280) < 992) {
      const menu = this.header().getByRole("button", {
        name: "Menu",
        exact: true,
      });
      await this.tabTo(menu, "backward");
      await this.page.keyboard.press("Enter");
      const dialog = this.page.getByRole("dialog", {
        name: "Menu",
        exact: true,
      });
      await expect(dialog).toBeVisible();
      const dialogId = await dialog.getAttribute("id");
      if (!dialogId)
        throw new Error("Le menu ouvert doit avoir un identifiant");
      await expect(menu).toHaveAttribute("aria-controls", dialogId);
      await expectAriaReferencesResolve(this.header());
      await expect(
        dialog.getByRole("button", { name: "Fermer", exact: true }),
      ).toBeFocused();
      await this.page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(menu).toBeFocused();
    }
  }

  private async expectSelectedProfileTab(tab: Locator): Promise<void> {
    await expect(tab).toBeFocused();
    await expect(tab).toHaveAttribute("aria-selected", "true");
    await expect(tab).toHaveAttribute("tabindex", "0");
    await expect(tab).toBeInViewport({ ratio: 1 });
    await expect(
      this.profileTabs().getByRole("tab", { selected: true }),
    ).toHaveCount(1);
    const association = await tab.evaluate((element) => {
      const id = element.getAttribute("aria-controls");
      const panel = id ? document.getElementById(id) : null;
      return {
        controls: id,
        role: panel?.getAttribute("role"),
        labels: panel?.getAttribute("aria-labelledby")?.split(/\s+/) ?? [],
        tabId: element.id,
      };
    });
    expect(association.controls).toBeTruthy();
    expect(association.role).toBe("tabpanel");
    expect(association.labels).toContain(association.tabId);
    const name = (await tab.textContent())?.replace(/\s+/g, " ").trim() ?? "";
    await expect(tab).toHaveAccessibleName(name);
    await expect(
      this.main().getByRole("tabpanel", {
        name,
        exact: true,
      }),
    ).toBeVisible();
    await this.waitForProfileLayout();
    await expect(this.main().getByRole("tabpanel")).toHaveCount(1);
  }

  private async waitForProfileLayout(): Promise<void> {
    // Les panneaux sortants restent montés pendant leur transition. Attendre le
    // panneau stabilisé avant d'exercer Tab évite de viser une étape d'animation.
    await expect
      .poll(() =>
        this.byTestId("user-profile-tabs").evaluate(async (container) => {
          const height = container.getBoundingClientRect().height;
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          );
          return (
            Math.abs(container.getBoundingClientRect().height - height) < 0.5 &&
            container
              .getAnimations({ subtree: true })
              .every(
                (animation) =>
                  animation.effect?.getTiming().iterations === Infinity ||
                  (!animation.pending &&
                    ["finished", "idle"].includes(animation.playState)),
              )
          );
        }),
      )
      .toBe(true);
  }

  async traverseProfileTabsWithKeyboard(): Promise<void> {
    const tabs = this.profileTabs().getByRole("tab");
    const information = this.profileTabs().getByRole("tab", {
      name: "Mes informations",
      exact: true,
    });
    const tokens = this.profileTabs().getByRole("tab", {
      name: "Mes tokens",
      exact: true,
    });
    await expect(
      this.profileTabs().getByRole("tab", {
        name: "Mes abonnements",
        exact: true,
      }),
    ).toHaveCount(1);
    await expect(
      this.profileTabs().getByRole("tab", {
        name: /^Synchronisation Grist(?: Bêta)?$/,
      }),
    ).toHaveCount(1);
    expect(await tabs.count()).toBeGreaterThanOrEqual(3);
    await expectAriaReferencesResolve(this.profileTabs());
    await this.tabTo(information);
    await this.expectSelectedProfileTab(information);
    await expect(information).toMatchAriaSnapshot(
      '- tab "Mes informations" [selected]',
    );

    await this.page.keyboard.press("ArrowRight");
    await this.expectSelectedProfileTab(tokens);
    await expect(information).toHaveAttribute("aria-selected", "false");
    await this.page.keyboard.press("End");
    await this.expectSelectedProfileTab(tabs.last());
    await this.page.keyboard.press("Home");
    await this.expectSelectedProfileTab(information);
    await this.page.keyboard.press("ArrowLeft");
    await this.expectSelectedProfileTab(tabs.last());
    await this.page.keyboard.press("ArrowRight");
    await this.expectSelectedProfileTab(information);
    await this.page.keyboard.press("ArrowRight");
    await this.expectSelectedProfileTab(tokens);
    const panelId = await tokens.getAttribute("aria-controls");
    await this.page.keyboard.press(tabKey(this.page));
    await expect
      .poll(() =>
        this.page.evaluate(
          () => document.activeElement?.closest('[role="tabpanel"]')?.id,
        ),
      )
      .toBe(panelId);
    await this.page.keyboard.press(`Shift+${tabKey(this.page)}`);
    await expect(tokens).toBeFocused();
    await expect(this.page).toHaveTitle(
      "Profil utilisateur - Référentiel des applications",
    );
  }
}
