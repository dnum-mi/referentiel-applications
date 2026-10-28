import { expect } from "@playwright/test";
import type { NVDAPlaywright } from "@guidepup/playwright";
import type { TestInfo } from "@playwright/test";
import {
  test,
  attachIdentity,
  captureStep,
  focusDocumentStart,
  normalizeSpeech,
} from "./fixture.js";
import { activateCurrent, shiftTabTo, tabTo } from "./native-utils.js";
import {
  finishShared,
  mountSharedScene,
  sharedNetwork,
} from "./shared-interactive-utils.js";

test.use({ serviceWorkers: "block" });
test.beforeEach(async ({}, info) => {
  info.setTimeout(600_000);
  info.annotations.push({
    type: "RGAA",
    description:
      "7.1.2 — U01/U02/U03 : scènes ciblées sur les vrais composants ; couverture complète à consolider séparément",
  });
});

async function currentFocus(
  nvda: NVDAPlaywright,
  info: TestInfo,
  step: string,
) {
  return captureStep(
    nvda,
    step,
    () =>
      nvda.perform(nvda.keyboardCommands.reportCurrentFocus, { capture: true }),
    info,
  );
}

/** Native quick navigation: the spoken name selects the target, never a DOM focus write. */
async function nextButtonTo(
  nvda: NVDAPlaywright,
  name: string,
  info: TestInfo,
  maximum = 20,
) {
  let browseMode = false;
  for (let attempt = 0; attempt < 2; attempt++) {
    const mode = await captureStep(
      nvda,
      `quick-button-browse-${attempt}`,
      () =>
        nvda.perform(nvda.keyboardCommands.toggleBetweenBrowseAndFocusMode, {
          capture: true,
        }),
      info,
    );
    if (mode.text.includes("mode navigation")) {
      browseMode = true;
      break;
    }
  }
  if (!browseMode)
    throw new Error(
      "Mode navigation non annoncé avant la recherche native de bouton.",
    );
  const visited: string[] = [];
  for (let index = 0; index < maximum; index++) {
    const result = await captureStep(
      nvda,
      `native-button-${index}`,
      () =>
        nvda.perform(nvda.keyboardCommands.moveToNextButton, { capture: true }),
      info,
    );
    visited.push(result.text);
    if (result.text.includes(normalizeSpeech(name))) return result;
  }
  throw new Error(
    `Bouton non trouvé par NVDA : ${name}. Annonces natives : ${JSON.stringify(visited)}`,
  );
}

test("AT-INT-U01 — App réelle, raccourci footer public, route, menu connecté et thème", async ({
  page,
  browser,
  nvda,
}, info) => {
  const network = await sharedNetwork(page);
  await page.goto(network.base);
  await page.emulateMedia({ colorScheme: "light" });
  await mountSharedScene(page, "navigation");
  await attachIdentity(nvda, browser.version(), info);
  await focusDocumentStart(page, nvda);
  // Ctrl+Home places the browse cursor on the first link while DOM focus may
  // still be on the route heading. Enter the tab sequence, then go back to it.
  await captureStep(
    nvda,
    "public-shortcut-enter-tab-sequence",
    () => nvda.press("Tab", { capture: true }),
    info,
  );
  await expect(page.locator("#header-nav")).toHaveCount(0);
  const shortcut = await shiftTabTo(nvda, "Aller au pied de page", info, 5);
  expect(shortcut.text).toContain("lien");
  await activateCurrent(nvda, info, "public-footer-shortcut");
  await captureStep(
    nvda,
    "public-footer-first-link",
    () => nvda.press("Tab", { capture: true }),
    info,
  );
  await expect(
    page.getByRole("contentinfo").getByRole("link").first(),
  ).toBeFocused();
  const target = await currentFocus(
    nvda,
    info,
    "public-footer-shortcut-destination",
  );
  expect(target.text).toContain("lien");
  await tabTo(nvda, "Accessibilité", info);
  await expect(
    page.getByRole("contentinfo").getByRole("link", { name: /^Accessibilité/ }),
  ).toBeFocused();
  const route = await activateCurrent(nvda, info, "real-accessibility-route");
  await expect
    .poll(() => page.evaluate(() => window.__rgaaShared?.path()))
    .toBe("/accessibilite");
  await expect(page.getByTestId("page-title-announcer")).toBeFocused();
  const routeFocus = await currentFocus(nvda, info, "route-title-focus");
  expect(route.text + routeFocus.text).toContain("accessibilite");

  // Synthetic authentication state is setup, not a test of the OIDC login flow.
  await page.evaluate(() => window.__rgaaShared?.setAuthenticated(true));
  await expect(
    page
      .locator("#header-nav")
      .getByRole("link", { name: "Applications", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 640, height: 900 });
  await focusDocumentStart(page, nvda);
  const menu = await tabTo(nvda, "Menu", info);
  expect(menu.text).toContain("bouton");
  const opened = await activateCurrent(nvda, info, "compact-menu-open");
  await expect(
    page.getByRole("dialog", { name: "Menu", exact: true }),
  ).toBeVisible();
  const menuFocus = await currentFocus(nvda, info, "compact-menu-focus");
  expect(opened.text + menuFocus.text).toMatch(/menu|dialogue/);
  await captureStep(
    nvda,
    "compact-menu-escape",
    () => nvda.press("Escape", { capture: true }),
    info,
  );
  await expect(
    page.getByRole("dialog", { name: "Menu", exact: true }),
  ).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Menu", exact: true }),
  ).toBeFocused();
  expect(
    (await currentFocus(nvda, info, "compact-menu-return-focus")).text,
  ).toContain("menu");
  await nextButtonTo(nvda, "Paramètres d'affichage", info);
  const before = await page.locator("html").getAttribute("data-fr-theme");
  await activateCurrent(nvda, info, "real-theme-toggle");
  await expect
    .poll(() => page.locator("html").getAttribute("data-fr-theme"))
    .not.toBe(before);
  const theme = await currentFocus(nvda, info, "new-theme-name");
  expect(theme.text).toContain("parametres d affichage");
  expect(theme.text).toContain(
    before === "dark"
      ? "actuellement en mode clair"
      : "actuellement en mode sombre",
  );
  await finishShared(page, network, info);
});

test("AT-INT-U02 — vraie recherche/RefAppTable, tri, pagination, colonnes/largeur et cases des notifications", async ({
  page,
  browser,
  nvda,
}, info) => {
  const network = await sharedNetwork(page);
  await page.goto(network.base);
  await mountSharedScene(page, "search");
  await expect(page.getByTestId("pagination-page-status")).toContainText(
    "Page 1 sur 3",
  );
  await attachIdentity(nvda, browser.version(), info);
  await focusDocumentStart(page, nvda);
  await tabTo(nvda, "Fermer les filtres", info);
  await activateCurrent(nvda, info, "desktop-filter-close");
  await expect(page.getByTestId("sidebar-filter")).not.toBeVisible();
  await tabTo(nvda, /^nom\b/, info);
  await expect(
    page.getByRole("button", { name: "Nom", exact: true }),
  ).toBeFocused();
  await activateCurrent(nvda, info, "sort-label-descending");
  await expect(page.locator('th[data-column-field="label"]')).toHaveAttribute(
    "aria-sort",
    "descending",
  );
  const sort = await currentFocus(nvda, info, "sort-current-state");
  expect(sort.text).toContain("nom");
  // The button's title describes its state; NVDA reports native object descriptions.
  const sortObject = await captureStep(
    nvda,
    "sort-object-description",
    () =>
      nvda.perform(nvda.keyboardCommands.reportCurrentObject, {
        capture: true,
      }),
    info,
  );
  expect(sort.text + sortObject.text).toContain("tri descendant");
  await tabTo(nvda, "Page suivante", info);
  const next = await activateCurrent(nvda, info, "server-page-two");
  await expect(page.getByTestId("pagination-page-status")).toContainText(
    "Page 2 sur 3",
  );
  expect(next.text).toContain("page 2 sur 3");
  await tabTo(nvda, "Dernière page", info);
  const last = await activateCurrent(nvda, info, "server-page-three");
  await expect(page.getByTestId("pagination-page-status")).toContainText(
    "Page 3 sur 3",
  );
  await expect(page.getByTestId("pagination-last")).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await expect(page.getByTestId("pagination-last")).toBeFocused();
  expect(last.text).toContain("page 3 sur 3");
  const callsAtBound = network.extraCalls.filter(
    (call) => call.pathname === "/api/v2/applications",
  ).length;
  await activateCurrent(nvda, info, "disabled-last-page-no-request");
  expect(
    network.extraCalls.filter(
      (call) => call.pathname === "/api/v2/applications",
    ),
  ).toHaveLength(callsAtBound);
  await focusDocumentStart(page, nvda);
  await nextButtonTo(nvda, "Première page", info);
  await activateCurrent(nvda, info, "server-first-page");
  await expect(page.getByTestId("pagination-page-status")).toContainText(
    "Page 1 sur 3",
  );

  await focusDocumentStart(page, nvda);
  await nextButtonTo(nvda, "Personnaliser les colonnes", info);
  const columns = await activateCurrent(
    nvda,
    info,
    "real-column-customization-dialog",
  );
  const dialog = page.getByRole("dialog", {
    name: "Personnaliser les colonnes",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  // Keep the spontaneous opening announcement distinct from an explicit
  // focus report. The native activation can return before the modal focuses.
  const settledColumns = await captureStep(
    nvda,
    "column-dialog-focus-and-delayed-announcement",
    async () => {
      await nvda.capture(
        async () => {
          await expect
            .poll(() =>
              dialog.evaluate((element) =>
                element.contains(document.activeElement),
              ),
            )
            .toBe(true);
          await page.waitForTimeout(1500);
        },
        { capture: true },
      );
    },
    info,
  );
  const columnFocus = await currentFocus(
    nvda,
    info,
    "column-dialog-current-focus",
  );
  expect(columnFocus.text).toMatch(/fermer.*bouton|bouton.*fermer/);
  expect(columns.text + settledColumns.text).toContain(
    "personnaliser les colonnes",
  );
  await tabTo(nvda, "Tags", info);
  await expect(
    dialog.getByRole("checkbox", { name: "Tags", exact: true }),
  ).toBeFocused();
  await captureStep(
    nvda,
    "hide-tags-column-space",
    () => nvda.press("Space", { capture: true }),
    info,
  );
  await expect(
    dialog.getByRole("checkbox", { name: "Tags", exact: true }),
  ).not.toBeChecked();
  await expect(
    page
      .getByTestId("application-table-view")
      .getByRole("columnheader", { name: "Tags", exact: true }),
  ).toHaveCount(0);
  expect(
    (await currentFocus(nvda, info, "hidden-column-checkbox-state")).text,
  ).toMatch(/tags.*(?:non coche|decoche)/);
  await tabTo(nvda, "Nom — largeur en pixels", info);
  const width = await captureStep(
    nvda,
    "keyboard-column-width",
    async () => {
      await nvda.press("Control+a", { capture: true });
      await nvda.type("340");
      await nvda.press("Tab", { capture: true });
    },
    info,
  );
  await expect(dialog.getByRole("status")).toContainText(
    "Nom est maintenant de 340 pixels",
  );
  expect(width.text).toContain("nom est maintenant de 340 pixels");
  await tabTo(nvda, "Fermer", info);
  await activateCurrent(nvda, info, "column-dialog-close");
  await expect(page.getByTestId("customize-columns-button")).toBeFocused();
  expect(
    (await currentFocus(nvda, info, "column-dialog-return-focus")).text,
  ).toContain("personnaliser les colonnes");

  // Selection is present on NotificationsPage; the application search table has no selection column.
  await mountSharedScene(page, "notifications");
  await focusDocumentStart(page, nvda);
  await tabTo(nvda, "Sélectionner la ligne", info);
  const checked = await captureStep(
    nvda,
    "real-row-checkbox-space",
    () => nvda.press("Space", { capture: true }),
    info,
  );
  await expect(
    page.getByRole("checkbox", {
      name: "Désélectionner la ligne",
      exact: true,
    }),
  ).toBeChecked();
  await expect(
    page.getByTestId("notifications-page-delete-selection"),
  ).toContainText("(1)");
  const checkedFocus = await currentFocus(
    nvda,
    info,
    "selected-row-native-name",
  );
  expect(checked.text + checkedFocus.text).toContain("deselectionner la ligne");
  await captureStep(
    nvda,
    "real-row-checkbox-uncheck",
    () => nvda.press("Space", { capture: true }),
    info,
  );
  await expect(
    page.getByRole("checkbox", { name: "Sélectionner la ligne", exact: true }),
  ).not.toBeChecked();
  await expect(
    page.getByTestId("notifications-page-delete-selection"),
  ).toHaveCount(0);
  await focusDocumentStart(page, nvda);
  await tabTo(nvda, "Tout sélectionner", info);
  await captureStep(
    nvda,
    "real-header-select-all",
    () => nvda.press("Space", { capture: true }),
    info,
  );
  await expect(
    page.getByRole("checkbox", { name: "Tout désélectionner", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", {
      name: "Désélectionner la ligne",
      exact: true,
    }),
  ).toBeChecked();
  expect(
    (await currentFocus(nvda, info, "selected-header-native-name")).text,
  ).toContain("tout deselectionner");
  await captureStep(
    nvda,
    "real-header-unselect-all",
    () => nvda.press("Space", { capture: true }),
    info,
  );
  await expect(
    page.getByRole("checkbox", { name: "Tout sélectionner", exact: true }),
  ).not.toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Sélectionner la ligne", exact: true }),
  ).not.toBeChecked();
  await finishShared(page, network, info);
});

test("AT-INT-U03 — vrais filtres compacts, accordéons, données filtrées, dialogue et refus natif de suppression", async ({
  page,
  browser,
  nvda,
}, info) => {
  await page.setViewportSize({ width: 640, height: 900 });
  const network = await sharedNetwork(page);
  await page.goto(network.base);
  await mountSharedScene(page, "search");
  await attachIdentity(nvda, browser.version(), info);
  await focusDocumentStart(page, nvda);
  await tabTo(nvda, "Ouvrir les filtres", info);
  await activateCurrent(nvda, info, "mobile-filter-open");
  await expect(page.getByTestId("sidebar-filter")).toBeVisible();
  await expect(page.getByTestId("sidebar-toggle")).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  const general = page.getByRole("button", {
    name: "Informations génerales",
    exact: true,
  });
  await expect(general).toHaveAttribute("aria-expanded", "false");
  const initial = await tabTo(nvda, "Informations génerales", info);
  expect(initial.text).toContain("reduit");
  await activateCurrent(nvda, info, "general-filter-expand");
  await expect(general).toHaveAttribute("aria-expanded", "true");
  expect(
    (await currentFocus(nvda, info, "general-filter-expanded-state")).text,
  ).toContain("developpe");
  await activateCurrent(nvda, info, "general-filter-collapse");
  await expect(general).toHaveAttribute("aria-expanded", "false");
  expect(
    (await currentFocus(nvda, info, "general-filter-collapsed-state")).text,
  ).toContain("reduit");
  await activateCurrent(nvda, info, "general-filter-reopen");
  await tabTo(nvda, /nom de l application.*(?:editable|editer|edition)/, info);
  await expect(page.getByTestId("application-filter-label")).toBeFocused();
  await captureStep(nvda, "real-text-filter", () => nvda.type("Alpha"), info);
  await expect(page.getByTestId("sidebar-total-count")).toContainText(
    "3 application(s)",
  );
  await nextButtonTo(nvda, "Qualité", info);
  await activateCurrent(nvda, info, "quality-filter-expand");
  await tabTo(nvda, "IQ minimum", info);
  const iq = await captureStep(
    nvda,
    "real-iq-filter",
    async () => {
      await nvda.press("Control+a", { capture: true });
      await nvda.type("50");
    },
    info,
  );
  await expect(page.getByTestId("sidebar-total-count")).toContainText(
    "1 application(s)",
  );
  const iqFocus = await currentFocus(nvda, info, "iq-field-native-value");
  expect(iq.text + iqFocus.text).toContain("50");
  expect(iqFocus.text).toContain("iq minimum");
  await focusDocumentStart(page, nvda);
  // This scene uses the actual compact layout: results are cards, not a table.
  const filteredRow = await tabTo(nvda, /application alpha 03.*lien/, info, 80);
  expect(filteredRow.text).toContain("application alpha 03");

  await focusDocumentStart(page, nvda);
  await nextButtonTo(nvda, "Filtres sauvegardés", info);
  await activateCurrent(nvda, info, "saved-filters-expand");
  await tabTo(nvda, "Sauvegarder les filtres actuels", info);
  const save = await activateCurrent(nvda, info, "save-filter-dialog-open");
  const dialog = page.getByRole("dialog", {
    name: "Sauvegarder les filtres actuels",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  expect(save.text).toContain("sauvegarder les filtres actuels");
  await tabTo(nvda, "Nom du filtre", info);
  await captureStep(
    nvda,
    "synthetic-unsent-filter-name",
    () => nvda.type("Brouillon synthetique"),
    info,
  );
  await expect(
    dialog.getByRole("textbox", { name: /Nom du filtre/ }),
  ).toHaveValue("Brouillon synthetique");
  await tabTo(nvda, "Annuler", info);
  await activateCurrent(nvda, info, "save-filter-dialog-cancel");
  await expect(page.getByTestId("save-filter-button")).toBeFocused();
  await tabTo(nvda, "Supprimer le filtre Filtre Alpha", info);
  // Register before activation: Playwright must not auto-dismiss this native confirmation.
  const confirmationEvent = page.waitForEvent("dialog");
  const confirmationSpeech = await activateCurrent(
    nvda,
    info,
    "native-filter-delete-confirmation",
  );
  const confirmation = await confirmationEvent;
  expect(confirmation.type()).toBe("confirm");
  expect(confirmation.message()).toBe(
    "Supprimer définitivement le filtre sauvegardé « Filtre Alpha » ?",
  );
  const confirmationFocus = await currentFocus(
    nvda,
    info,
    "native-confirm-focus",
  );
  expect(confirmationSpeech.text + confirmationFocus.text).toMatch(
    /supprimer definitivement.*filtre alpha/,
  );
  await captureStep(
    nvda,
    "native-confirm-escape-refusal",
    () => nvda.press("Escape", { capture: true }),
    info,
  );
  await expect(
    page.getByTestId("saved-filter-apply-saved-at-001"),
  ).toBeVisible();
  await expect(
    page.getByTestId("saved-filter-delete-saved-at-001"),
  ).toBeFocused();
  await focusDocumentStart(page, nvda);
  await nextButtonTo(nvda, "Fermer les filtres", info);
  await activateCurrent(nvda, info, "mobile-filter-close");
  await expect(page.getByTestId("sidebar-filter")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Ouvrir les filtres", exact: true }),
  ).toBeFocused();
  expect(
    (await currentFocus(nvda, info, "mobile-filter-return-focus")).text,
  ).toContain("ouvrir les filtres");
  await finishShared(page, network, info);
});
