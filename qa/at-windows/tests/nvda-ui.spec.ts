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

test("AT-INT-organisations — vrais champ/select, absence puis erreur de recherche", async ({
  page,
  browser,
  nvda,
}, info) => {
  const network = await simulatedNetwork(page);
  await page.goto(network.base);
  await mountProductionScene(
    page,
    "/src/components/common/OrganizationSearchSelect.vue",
    { label: "Organisation de démonstration", required: true },
  );
  await attachIdentity(nvda, browser.version(), info);
  await focusDocumentStart(page, nvda);
  await tabTo(nvda, "Organisation de démonstration", info);
  const results = await captureStep(
    nvda,
    "organization-results",
    () => nvda.type("org"),
    info,
  );
  await expect(page.getByTestId("org-search-status")).toContainText(
    "1 résultat trouvé",
  );
  expect(results.text).toContain("1 resultat trouve");
  await tabTo(nvda, "Choisir une organisation de votre choix", info);
  const chosen = await captureStep(
    nvda,
    "organization-select",
    async () => {
      await nvda.press("End");
      await nvda.press("Enter");
    },
    info,
  );
  expect(chosen.text).toContain("organisation synthetique");
  network.state.searchMode = "empty";
  await tabTo(nvda, "Organisation de démonstration", info);
  await nvda.press("Control+a", { capture: false });
  const empty = await captureStep(
    nvda,
    "organization-empty",
    () => nvda.type("vide"),
    info,
  );
  expect(empty.text).toContain("aucune organisation trouvee");
  network.state.searchMode = "error";
  await nvda.press("Control+a", { capture: false });
  const error = await captureStep(
    nvda,
    "organization-get-500",
    () => nvda.type("err"),
    info,
  );
  expect(error.text).toContain("erreur lors de la recherche d organisations");
  await finishInteractive(page, network, info);
});

test("AT-INT-profil — vrais onglets, token non soumis, retrait puis réaccord Grist", async ({
  page,
  browser,
  nvda,
}, info) => {
  const network = await simulatedNetwork(page);
  await page.goto(network.base);
  await mountProductionScene(page, "/src/views/UserProfilePage.vue");
  await expect(
    page.getByRole("tab", { name: "Synchronisation Grist", exact: true }),
  ).toBeVisible();
  await attachIdentity(nvda, browser.version(), info);
  await focusDocumentStart(page, nvda);
  await tabTo(nvda, "Mes informations", info);
  const selected = await captureStep(
    nvda,
    "profile-next-tab",
    () => nvda.press("ArrowRight"),
    info,
  );
  await expect(
    page.getByRole("tab", { name: "Mes tokens", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  expect(selected.text).toContain("mes tokens");
  await tabTo(nvda, "Créer un nouveau token", info);
  await activateCurrent(nvda, info, "token-form-open-without-submit");
  await expect(page.locator("#token-name")).toBeFocused();
  const name = await captureStep(
    nvda,
    "token-name-and-draft",
    () => nvda.type("NVDA"),
    info,
  );
  expect(name.text).toMatch(/n\s*v\s*d\s*a/i);
  await expect(page.locator("#token-name")).toHaveValue("NVDA");
  await tabTo(nvda, "Annuler", info);
  await activateCurrent(nvda, info, "token-form-cancel");
  await expect(page.getByTestId("token-create-btn")).toBeFocused();
  await tabTo(nvda, "Mes tokens", info);
  const last = await captureStep(
    nvda,
    "profile-end-key",
    () => nvda.press("End"),
    info,
  );
  await expect(
    page.getByRole("tab", { name: "Synchronisation Grist", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  expect(last.text).toContain("synchronisation grist");
  await tabTo(nvda, "Identifiant du document", info);
  network.state.gristPermission = false;
  const revoked = await captureStep(
    nvda,
    "permission-revoked-through-real-store",
    async () => {
      await nvda.capture(
        () => page.evaluate(() => window.__rgaaAtHost?.refreshUser()),
        { capture: true },
      );
    },
    info,
  );
  await expect(
    page.getByRole("tab", { name: "Synchronisation Grist", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("tab", { name: "Mes informations", exact: true }),
  ).toBeFocused();
  expect(revoked.text).toContain("mes informations");
  network.state.gristPermission = true;
  await page.evaluate(() => window.__rgaaAtHost?.refreshUser());
  await expect(
    page.getByRole("tab", { name: "Synchronisation Grist", exact: true }),
  ).toBeVisible();
  const granted = await captureStep(
    nvda,
    "permission-regranted-end-key",
    () => nvda.press("End"),
    info,
  );
  await expect(
    page.getByRole("tab", { name: "Synchronisation Grist", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  expect(granted.text).toContain("synchronisation grist");
  expect(network.calls.filter((call) => call.method !== "GET")).toHaveLength(0);
  await finishInteractive(page, network, info);
});

test("AT-INT-liens — vrai formulaire, HTTP500 simulé, alerte locale et saisie conservée", async ({
  page,
  browser,
  nvda,
}, info) => {
  const network = await simulatedNetwork(page);
  await page.goto(network.base);
  await mountProductionScene(page, "/src/components/LinksTab.vue", {
    application: true,
  });
  await expect(
    page.getByRole("button", { name: "Ajouter un lien", exact: true }),
  ).toBeEnabled();
  await attachIdentity(nvda, browser.version(), info);
  await focusDocumentStart(page, nvda);
  await tabTo(nvda, "Ajouter un lien", info);
  await activateCurrent(nvda, info, "link-modal-open");
  await tabTo(nvda, "Type de lien", info);
  await nvda.press("ArrowDown");
  await nvda.press("ArrowDown");
  await tabTo(nvda, "URL", info);
  await nvda.type("https://example.invalid", { capture: false });
  await tabTo(nvda, "Description", info);
  await nvda.type("Lien test", { capture: false });
  await tabTo(nvda, "Enregistrer", info);
  const error = await activateCurrent(nvda, info, "link-post-500");
  await expect(page.getByTestId("link-form-error")).toContainText(
    "Erreur lors de la création du lien. Votre saisie est conservée.",
  );
  expect(error.text).toContain("votre saisie est conservee");
  await expect(page.getByRole("textbox", { name: /^URL/ })).toHaveValue(
    "https://example.invalid",
  );
  await expect(page.getByRole("textbox", { name: /^Description/ })).toHaveValue(
    "Lien test",
  );
  await expect(page.getByTestId("link-submit-btn")).toBeFocused();
  expect(network.calls.filter((call) => call.method === "POST")).toHaveLength(
    1,
  );
  await tabTo(nvda, "Annuler", info);
  await activateCurrent(nvda, info, "link-modal-cancel");
  await expect(
    page.getByRole("dialog", { name: "Ajouter un lien", exact: true }),
  ).not.toBeVisible();
  await finishInteractive(page, network, info);
});
