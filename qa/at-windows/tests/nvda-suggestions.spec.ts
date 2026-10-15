import { expect } from "@playwright/test";
import {
  test,
  attachIdentity,
  captureStep,
  focusDocumentStart,
} from "./fixture.js";
import {
  finishInteractive,
  mountProductionScene,
  simulatedNetwork,
} from "./interactive-utils.js";
import { activateCurrent, tabTo } from "./native-utils.js";

test.use({ serviceWorkers: "block" });
test.beforeEach(async ({}, info) => {
  info.setTimeout(300_000);
  info.annotations.push({
    type: "RGAA",
    description:
      "7.1.2 — lot interactif ciblé, pas couverture des 34 cas complète",
  });
});

test("AT-INT-suggestions — vrai dialogue relation, option active, sélection/retrait et recherche HTTP500", async ({
  page,
  browser,
  nvda,
}, info) => {
  const network = await simulatedNetwork(page);
  await page.goto(network.base);
  await mountProductionScene(page, "/src/components/RelationshipsTab.vue", {
    application: true,
  });
  await expect(
    page.getByRole("button", { name: "Ajouter une relation", exact: true }),
  ).toBeEnabled();
  await attachIdentity(nvda, browser.version(), info);
  await focusDocumentStart(page, nvda);
  await tabTo(nvda, "Ajouter une relation", info);
  await activateCurrent(nvda, info, "relation-modal-open");
  await expect(
    page.getByRole("dialog", { name: "Ajouter une relation", exact: true }),
  ).toBeVisible();
  await tabTo(nvda, "Rechercher une application", info);
  const suggestions = await captureStep(
    nvda,
    "suggestions-live-results",
    () => nvda.type("app"),
    info,
  );
  await expect(
    page.getByTestId("relation-suggestions-input").getByRole("option"),
  ).toHaveCount(2);
  expect(suggestions.text).toContain("2 suggestion");
  const active = await captureStep(
    nvda,
    "suggestion-arrow-down",
    () => nvda.press("ArrowDown"),
    info,
  );
  expect(active.text).toContain("application fictive beta");
  await expect(
    page.getByTestId("relation-suggestions-input").getByRole("combobox"),
  ).toBeFocused();
  await captureStep(
    nvda,
    "suggestion-select-enter",
    () => nvda.press("Enter"),
    info,
  );
  await expect(
    page.getByRole("button", { name: "Application fictive Bêta", exact: true }),
  ).toBeVisible();
  await tabTo(nvda, "Application fictive Bêta", info);
  const removed = await activateCurrent(
    nvda,
    info,
    "remove-selected-application",
  );
  expect(removed.text).toContain("selection retiree");
  expect(removed.text).toContain("application fictive beta");
  await expect(
    page.getByRole("button", { name: "Application fictive Bêta", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByTestId("relation-suggestions-input").getByRole("combobox"),
  ).toBeFocused();
  network.state.searchMode = "error";
  await tabTo(nvda, "Rechercher une application", info);
  const error = await captureStep(
    nvda,
    "suggestions-get-500",
    () => nvda.type("zzz"),
    info,
  );
  await expect(
    page.getByTestId("relation-suggestions-input").getByRole("alert"),
  ).toContainText("Erreur lors de la recherche d'applications");
  expect(error.text).toContain("erreur lors de la recherche d applications");
  network.state.searchMode = "results";
  const mediation = page.getByTestId(
    "relation-suggestions-mediation-service-input",
  );
  await tabTo(nvda, "Rechercher une application de mediation service", info);
  const mediationResults = await captureStep(
    nvda,
    "mediation-live-results",
    () => nvda.type("app", { capture: true }),
    info,
  );
  await expect(mediation.getByRole("option")).toHaveCount(2);
  expect(mediationResults.text).toContain("2 suggestion");
  const mediationChoice = await captureStep(
    nvda,
    "mediation-native-option",
    () => nvda.press("ArrowDown", { capture: true }),
    info,
  );
  expect(mediationChoice.text).toContain("application fictive beta");
  const activeOption = await mediation
    .getByRole("combobox")
    .getAttribute("aria-activedescendant");
  expect(activeOption).toBeTruthy();
  await expect(mediation.locator(`[id="${activeOption}"]`)).toHaveCount(1);
  await activateCurrent(nvda, info, "mediation-select-enter");
  await expect(
    mediation.getByRole("button", {
      name: "Application fictive Bêta",
      exact: true,
    }),
  ).toBeVisible();
  await tabTo(nvda, "Application fictive Bêta", info);
  const mediationRemoved = await activateCurrent(
    nvda,
    info,
    "mediation-remove-selection",
  );
  expect(mediationRemoved.text).toContain("selection retiree");
  expect(mediationRemoved.text).toContain("application fictive beta");
  await expect(mediation.getByRole("combobox")).toBeFocused();
  await expect(
    mediation.getByRole("button", {
      name: "Application fictive Bêta",
      exact: true,
    }),
  ).toHaveCount(0);
  await tabTo(nvda, "Annuler", info);
  await activateCurrent(nvda, info, "relation-modal-cancel");
  await expect(
    page.getByRole("dialog", { name: "Ajouter une relation", exact: true }),
  ).not.toBeVisible();
  await finishInteractive(page, network, info);
});
