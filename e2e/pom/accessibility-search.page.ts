import { expect, type Locator, type Request } from "@playwright/test";
import { SearchPage } from "./search.page";
import {
  expectAriaReferencesResolve,
  expectDialogKeyboardContainment,
  expectReachableByTab,
} from "../support/accessibility";
import { waitForSearchParams } from "../support/helpers";

interface SuggestionFixture {
  label: string;
  id: string;
}

/** Parcours clavier du catalogue sur l'application et ses API réelles. */
export class AccessibilitySearchPage extends SearchPage {
  private filters = () => this.byTestId("sidebar-filter");
  private resultsStatus = () => this.byTestId("application-results-status");
  private resultsRegion = () => this.page.locator("#application-results");
  private applicationTable = () =>
    this.byTestId("application-table").getByRole("table");

  private async expandFilter(id: string): Promise<void> {
    if (!(await this.filters().isVisible())) {
      const toggle = this.byTestId("sidebar-toggle");
      await expectReachableByTab(this.page, toggle);
      await toggle.press("Enter");
      await expect(this.filters()).toBeVisible();
    }
    const trigger = this.byTestId(`sidebar-accordion-${id}`)
      .getByRole("button")
      .first();
    if ((await trigger.getAttribute("aria-expanded")) !== "true") {
      await expectReachableByTab(this.page, trigger);
      await trigger.press("Enter");
    }
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await this.expectFilterLayoutSettled();
  }

  private async expectFilterLayoutSettled(): Promise<void> {
    // Le DSFR lance l'ouverture sur deux frames. Tab doit exercer le panneau
    // stabilisé, pas un bouton que la transition précédente déplace ensuite.
    await expect
      .poll(() =>
        this.filters().evaluate(async (container) => {
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

  async expectConciseFilterNamesAndDescriptions(): Promise<void> {
    for (const id of [
      "portfolio",
      "general",
      "status",
      "organization",
      "hosting",
      "compliance",
      "relations",
      "donnees",
      "quality",
      "technologies",
    ]) {
      await this.expandFilter(id);
    }
    await expect(
      this.filters().locator("label button, legend button"),
    ).toHaveCount(0);
    const controls = [
      {
        role: "textbox",
        name: "Nom de l’application",
        description:
          "Recherche les applications dont le nom contient le texte saisi.",
      },
      {
        role: "textbox",
        name: "Lien externe",
        description:
          "Recherche les applications par URL d’une ressource externe associée (documentation, service, supervision…).",
      },
      {
        role: "textbox",
        name: "Email",
        description:
          "Recherche les applications ayant un acteur dont l'adresse email contient le texte saisi.",
      },
      {
        role: "combobox",
        name: "Nom de l'organisation",
        description:
          "Recherche les applications rattachées à une organisation dont le nom contient le texte saisi.",
      },
      {
        role: "combobox",
        name: "Type d'acteur",
        description:
          "Filtre les applications selon le type d'acteur associé (maîtrise d'ouvrage, maîtrise d'œuvre…), ou selon l'absence de MOA ou de MOE.",
      },
      {
        role: "checkbox",
        name: "Sans statut",
        description:
          "Affiche uniquement les applications sans statut renseigné.",
      },
      {
        role: "checkbox",
        name: "Sans hébergement",
        description:
          "Affiche uniquement les applications sans hébergement renseigné.",
      },
    ] as const;
    for (const { role, name, description } of controls) {
      const control = this.filters().getByRole(role, { name, exact: true });
      await expect(control).toHaveCount(1);
      await expect(control).toHaveAccessibleName(name);
      await expect(control).toHaveAccessibleDescription(description);
    }
    for (const { name, description } of [
      {
        name: "Tags",
        description:
          "Recherche les applications associées à un ou plusieurs tags sélectionnés.",
      },
      {
        name: "Priorité de redémarrage",
        description:
          "Filtre les applications selon leur priorité de redémarrage en cas d’incident, de R0 (socle technique indispensable, relance immédiate) à R3 (indisponibilité sans conséquence opérationnelle).",
      },
      {
        name: "Statut de l'application",
        description:
          "Filtre les applications selon leur statut de cycle de vie (en construction, en production, décommissionnée…).",
      },
      {
        name: "Conformité",
        description:
          "Filtre les applications selon leurs critères de conformité (continuité d'activité, sécurité, accessibilité, protection des données…).",
      },
      {
        name: "Indice de qualité",
        description:
          /Filtre les applications selon leur indice de qualité.*entre 0% et 100%/,
      },
    ]) {
      const group = this.filters().getByRole("group", { name, exact: true });
      await expect(group).toHaveCount(1);
      await expect(group).toHaveAccessibleName(name);
      await expect(group).toHaveAccessibleDescription(description);
    }
    const help = this.filters().getByRole("button", {
      name: "Afficher l’aide sur le filtre Nom de l’application",
      exact: true,
    });
    await expectReachableByTab(this.page, help);
    await expect(help).toBeFocused();
    await expect(help).not.toHaveAttribute("tabindex", "-1");
    await expect(help).toHaveAccessibleDescription(
      "Recherche les applications dont le nom contient le texte saisi.",
    );
    const organization = this.filters().getByRole("combobox", {
      name: "Nom de l'organisation",
      exact: true,
    });
    await organization.fill("TOTO");
    await expect(
      this.byTestId("organization-suggestions-list")
        .locator("option")
        .filter({ hasText: /^TOTO$/ }),
    ).toHaveCount(1);
    await expect(organization).toBeFocused();
    await expectAriaReferencesResolve(this.filters());
  }

  async expectSuggestionInstructionsAndKeyboardSelection(fixtures: {
    application: SuggestionFixture;
    division: SuggestionFixture;
    tag: { name: string; id: string };
  }): Promise<void> {
    await this.page.setViewportSize({ width: 375, height: 900 });
    await expect(this.byTestId("sidebar-toggle")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await expect(this.filters()).toBeHidden();
    const cases = [
      {
        accordion: "portfolio",
        group: this.byTestId("business-division-suggestions-input"),
        minimum: 3,
        label: fixtures.division.label,
        endpoint: "/api/v2/business-division",
        queryKey: "label",
        filterKey: "businessDivisionId",
        selectedValue: fixtures.division.id,
      },
      {
        accordion: "relations",
        group: this.byTestId("relation-suggestions-input"),
        minimum: 3,
        label: fixtures.application.label,
        endpoint: "/api/v2/applications",
        queryKey: "search",
        filterKey: "relationAppId",
        selectedValue: fixtures.application.id,
      },
      {
        accordion: "general",
        group: this.byTestId("search-tags"),
        minimum: 2,
        label: fixtures.tag.name,
        endpoint: "/api/v2/tags",
        queryKey: "name",
        filterKey: "tag",
        selectedValue: fixtures.tag.name,
      },
    ];
    for (const scenario of cases) {
      await this.expandFilter(scenario.accordion);
      await this.resetFilters();
      const input = scenario.group.getByRole("combobox");
      const hint = scenario.group.getByText(
        `Saisissez au moins ${scenario.minimum} caractères`,
        { exact: true },
      );
      await expect(hint).toBeVisible();
      await expect(input).toHaveAccessibleDescription(
        new RegExp(
          `Saisissez au moins ${scenario.minimum} caractères.*Recherche|Saisissez au moins ${scenario.minimum} caractères.*Sélectionne`,
        ),
      );
      const queries: string[] = [];
      const recordQuery = (request: Request) => {
        const url = new URL(request.url());
        const value = url.searchParams.get(scenario.queryKey);
        if (
          request.method() === "GET" &&
          url.pathname === scenario.endpoint &&
          value !== null
        )
          queries.push(value);
      };
      this.page.on("request", recordQuery);
      try {
        for (let length = 1; length < scenario.minimum; length++) {
          await input.fill(scenario.label.slice(0, length));
          const remaining = scenario.minimum - length;
          await expect(scenario.group.getByRole("status")).toHaveText(
            `Saisissez encore ${remaining} caractère${remaining > 1 ? "s" : ""}.`,
          );
          await expect(hint).toBeVisible();
          await expect(input).toHaveAttribute("aria-expanded", "false");
          // Observer au-delà des 300 ms de debounce réels : une vérification
          // immédiate ne prouverait pas qu'aucune recherche ne sera déclenchée.
          await this.page.waitForTimeout(350);
          expect(queries).toEqual([]);
        }
        const responsePromise = this.page.waitForResponse((response) => {
          const url = new URL(response.url());
          return (
            response.request().method() === "GET" &&
            url.pathname === scenario.endpoint &&
            url.searchParams.get(scenario.queryKey) === scenario.label
          );
        });
        await input.fill(scenario.label);
        const response = await responsePromise;
        expect([200, 304]).toContain(response.status());
        await expect(scenario.group.getByRole("listbox")).toBeVisible();
        await expect(scenario.group.getByRole("status")).toContainText(
          /suggestion[s]? disponible/,
        );
        expect(queries.length).toBeGreaterThan(0);
        expect(queries.every((value) => value.length >= scenario.minimum)).toBe(
          true,
        );
        await expect(hint).toBeVisible();
        await expectAriaReferencesResolve(scenario.group);
        await this.selectExactSuggestionWithKeyboard(
          scenario.group,
          input,
          scenario.label,
        );
        await waitForSearchParams(this.page, (params) =>
          (params.get(scenario.filterKey) ?? "")
            .split(",")
            .includes(scenario.selectedValue),
        );
        await expect(input).toBeFocused();
        await expect(input).toHaveAttribute("aria-expanded", "false");
        await expect(input).not.toHaveAttribute("aria-activedescendant", /.+/);
      } finally {
        this.page.off("request", recordQuery);
      }
    }
  }

  private async selectExactSuggestionWithKeyboard(
    group: Locator,
    input: Locator,
    label: string,
  ): Promise<void> {
    const options = group.getByRole("option");
    const labels = (await options.allTextContents()).map((text) => text.trim());
    const index = labels.indexOf(label);
    expect(
      index,
      `La suggestion « ${label} » doit provenir de l’API réelle`,
    ).toBeGreaterThanOrEqual(0);
    for (let step = 0; step <= index; step++) {
      await input.press("ArrowDown");
      const selected = options.nth(step);
      const id = await selected.getAttribute("id");
      expect(id).toBeTruthy();
      if (!id)
        throw new Error("La suggestion active doit avoir un identifiant.");
      await expect(input).toHaveAttribute("aria-activedescendant", id);
      await expect(selected).toHaveAttribute("aria-selected", "true");
    }
    await expect(group.getByRole("option", { selected: true })).toHaveCount(1);
    await input.press("Enter");
  }

  async expectEmptySearchKeepsFocusAndRecovers(
    application: SuggestionFixture,
    missingLabel: string,
  ): Promise<void> {
    await this.expandFilter("general");
    const input = this.filters().getByRole("textbox", {
      name: "Nom de l’application",
      exact: true,
    });
    const responsePromise = this.page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        url.pathname === "/api/v2/applications" &&
        url.searchParams.get("search") === missingLabel
      );
    });
    await input.fill(missingLabel);
    const response = await responsePromise;
    expect(response.ok()).toBe(true);
    const result: unknown = await response.json();
    expect(result).toMatchObject({ results: [], total: 0 });
    await expect(this.resultsRegion()).toHaveAttribute("aria-busy", "false");
    await expect(this.resultsStatus()).toHaveText(
      "0 applications trouvées. Page 1 sur 1.",
    );
    await expect(this.resultsStatus()).toHaveAttribute("aria-live", "polite");
    await expect(this.resultsStatus()).toHaveAttribute("aria-atomic", "true");
    await expect(this.applicationTable()).toContainText(
      "Aucune donnée ne correspond à votre recherche.",
    );
    await expect(input).toBeFocused();
    await input.fill(application.label);
    await expect(
      this.applicationTable().getByRole("link", {
        name: application.label,
        exact: true,
      }),
    ).toBeVisible();
    await expect(this.resultsStatus()).toHaveText(
      "1 application trouvée. Page 1 sur 1.",
    );
    await expect(input).toBeFocused();
    await expectAriaReferencesResolve(this.resultsRegion());
  }

  async expectTableSortingAndPagination(
    prefix: string,
    labels: string[],
  ): Promise<void> {
    expect(labels).toHaveLength(6);
    await this.open(new URLSearchParams({ search: prefix, pageSize: "5" }));
    const table = this.applicationTable();
    await expect(table).toHaveAccessibleName(/^Tableau : .*Nom/);
    const headers = table.getByRole("columnheader");
    expect(await headers.count()).toBeGreaterThan(1);
    for (const header of await headers.all())
      await expect(header).toHaveAttribute("scope", "col");
    const nameHeader = table.locator('th[data-column-field="label"]');
    const sort = nameHeader.getByRole("button", { name: "Nom", exact: true });
    await expect(nameHeader).toHaveAttribute("aria-sort", "ascending");
    await expect(this.resultsStatus()).toHaveText(
      "6 applications trouvées. Page 1 sur 2.",
    );
    const firstResult = table
      .locator("tbody tr")
      .first()
      .getByRole("link")
      .first();
    await expect(firstResult).toHaveText(labels[0]);
    await expectReachableByTab(this.page, sort);
    await sort.press("Enter");
    await expect(nameHeader).toHaveAttribute("aria-sort", "descending");
    await expect(firstResult).toHaveText(labels[5]);
    await expect(sort).toBeFocused();
    await sort.press("Space");
    await expect(nameHeader).toHaveAttribute("aria-sort", "ascending");
    await expect(firstResult).toHaveText(labels[0]);
    await expect(sort).toBeFocused();
    const next = this.byTestId("pagination-next");
    await expectReachableByTab(this.page, next);
    await next.press("Enter");
    await expect(this.resultsStatus()).toHaveText(
      "6 applications trouvées. Page 2 sur 2.",
    );
    await expect(this.byTestId("pagination-page-status")).toHaveText(
      "Page 2 sur 2",
    );
    await expect(this.resultsRegion()).toHaveAttribute("aria-busy", "false");
    await expect(firstResult).toHaveText(labels[5]);
    await expect(next).toHaveAttribute("aria-disabled", "true");
    await expect(next).toBeFocused();
    await next.press("Enter");
    await expect(this.resultsStatus()).toHaveText(
      "6 applications trouvées. Page 2 sur 2.",
    );
    await expect(next).toBeFocused();
    const first = this.byTestId("pagination-first");
    await expectReachableByTab(this.page, first);
    await first.press("Space");
    await expect(this.resultsStatus()).toHaveText(
      "6 applications trouvées. Page 1 sur 2.",
    );
    await expect(first).toHaveAttribute("aria-disabled", "true");
    await expect(first).toBeFocused();
    await expect(
      this.byTestId("pagination-component").getByRole("button", {
        name: "Page 1 sur 2",
        exact: true,
      }),
    ).toHaveAttribute("aria-current", "page");
    await expectAriaReferencesResolve(this.resultsRegion());
  }

  async expectMobileSearchDialogKeyboard(
    application: SuggestionFixture,
  ): Promise<void> {
    await this.page.setViewportSize({ width: 375, height: 900 });
    const open = this.byTestId("open-search-btn");
    await expect(open).toHaveCount(1);
    await expectReachableByTab(this.page, open);
    await open.press("Enter");
    const dialog = this.page.getByRole("dialog", {
      name: "Recherche d’une application",
      exact: true,
    });
    await expect(dialog).toBeVisible();
    const controlledDialogId = await open.getAttribute("aria-controls");
    // Cette association est facultative pour un bouton ouvrant un dialogue ;
    // lorsqu'elle est fournie, elle doit désigner ce dialogue unique.
    if (controlledDialogId !== null) {
      expect(controlledDialogId).not.toBe("");
      await expect(dialog).toHaveAttribute("id", controlledDialogId);
    }
    const popupType = await open.getAttribute("aria-haspopup");
    if (popupType !== null) expect(popupType).toBe("dialog");
    await expectAriaReferencesResolve(open);
    const input = dialog.getByRole("combobox");
    const close = dialog.getByRole("button", {
      name: "Fermer la recherche",
      exact: true,
    });
    await expect(input).toBeFocused();
    await input.press("Shift+Tab");
    await expect(close).toBeFocused();
    await close.press("Tab");
    await expect(input).toBeFocused();
    await expectDialogKeyboardContainment(this.page, dialog);
    await input.fill(application.label);
    await expect(
      dialog.getByRole("option", { name: new RegExp(application.label) }),
    ).toBeVisible();
    await input.press("ArrowDown");
    const selected = dialog.getByRole("option", { selected: true });
    const activeId = await selected.getAttribute("id");
    expect(activeId).toBeTruthy();
    await expect(input).toHaveAttribute("aria-activedescendant", activeId!);
    await expectAriaReferencesResolve(dialog);
    await input.press("Escape");
    await expect(dialog).toBeVisible();
    await expect(input).toHaveAttribute("aria-expanded", "false");
    await expect(input).toHaveValue(application.label);
    await input.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(open).toBeFocused();
    await open.press("Enter");
    await expect(dialog.getByRole("combobox")).toHaveValue("");
    await expectReachableByTab(this.page, close);
    await close.press("Enter");
    await expect(dialog).toHaveCount(0);
    await expect(open).toBeFocused();
  }
}
