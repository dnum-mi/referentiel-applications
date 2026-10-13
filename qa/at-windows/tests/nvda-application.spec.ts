import { expect, type Locator, type TestInfo } from "@playwright/test";
import type { NVDAPlaywright } from "@guidepup/playwright";
import {
  test,
  attachIdentity,
  captureStep,
  focusDocumentStart,
  normalizeSpeech,
} from "./fixture.js";
import { activateCurrent } from "./native-utils.js";
import {
  appFixtureIds,
  finishApplicationScene,
  mountApplicationScene,
  simulatedApplicationNetwork,
} from "./application-interactive-utils.js";

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

// Only native Tab moves focus. Repeated controls are identified in the DOM, but
// their names must be spoken. Date labels can be announced on arrival instead
// of by reportCurrentFocus, which only describes the active date segment.
async function reachControl(
  nvda: NVDAPlaywright,
  target: Locator,
  name: string,
  info: TestInfo,
) {
  await expect(target).toBeVisible();
  let arrival: Awaited<ReturnType<typeof captureStep>> | undefined;
  const visited: string[] = [];
  for (let index = 0; index <= 80; index++) {
    if (
      await target.evaluate(
        (element) =>
          element === document.activeElement ||
          element.contains(document.activeElement),
      )
    ) {
      const focus = await currentFocus(
        nvda,
        info,
        `application-current-${index}`,
      );
      const phrases = [...(arrival?.phrases ?? []), ...focus.phrases];
      const observed = { phrases, text: normalizeSpeech(phrases.join(" ")) };
      expect(observed.text).toContain(normalizeSpeech(name));
      return observed;
    }
    arrival = await captureStep(
      nvda,
      `application-native-tab-${index}`,
      () => nvda.press("Tab", { capture: true }),
      info,
    );
    visited.push(arrival.text);
  }
  throw new Error(
    `Commande non atteinte par Tab natif : ${name}. Annonces : ${JSON.stringify(visited)}`,
  );
}

test.use({ serviceWorkers: "block" });
test.beforeEach(async ({}, info) => {
  info.setTimeout(600_000);
  info.annotations.push({
    type: "RGAA",
    description:
      "7.1.2 — vrais composants acteur/technologie, données/exposition et notes/statut ; réseau fictif strict ; aucune clôture automatique des autres variantes",
  });
});

test("AT-APP-ActeurTechnologie — identité conditionnelle, confirmation native et erreurs simulées", async ({
  page,
  browser,
  nvda,
}, info) => {
  const network = await simulatedApplicationNetwork(page);
  await page.goto(network.base);
  const host = await mountApplicationScene(page, "actors-technologies");
  await info.attach("application-production-host", {
    body: Buffer.from(JSON.stringify(host)),
    contentType: "application/json",
  });
  await attachIdentity(nvda, browser.version(), info);
  await focusDocumentStart(page, nvda);
  const opener = page.getByTestId("actor-edit-btn");
  expect((await reachControl(nvda, opener, "Modifier", info)).text).toContain(
    "bouton",
  );
  const opening = await activateCurrent(nvda, info, "actor-real-edit-open");
  const actor = page.getByRole("dialog", {
    name: "Modifier l'acteur",
    exact: true,
  });
  await expect(actor).toBeVisible();
  expect(opening.text).toMatch(
    /modifier.*acteur.*dialogue|dialogue.*modifier.*acteur/,
  );
  for (const [id, name] of [
    ["actor-type-select", "Type d'acteur"],
    ["actor-email-input", "Email"],
  ] as const) {
    const field = await reachControl(nvda, actor.getByTestId(id), name, info);
    expect(field.text).toMatch(/liste|combo|edition/);
  }
  const group = actor.getByRole("checkbox", {
    name: "Cet acteur est rattaché(e) à une entité",
    exact: true,
  });
  await reachControl(nvda, group, "Cet acteur est rattaché", info);
  const checked = await captureStep(
    nvda,
    "actor-group-state-on",
    () => nvda.press("Space", { capture: true }),
    info,
  );
  await expect(group).toBeChecked();
  expect(checked.text).toMatch(/\bcochee?\b/);
  expect(checked.text).not.toContain("non coche");
  await expect(actor.getByTestId("actor-firstname-input")).not.toBeVisible();
  const unchecked = await captureStep(
    nvda,
    "actor-group-state-off",
    () => nvda.press("Space", { capture: true }),
    info,
  );
  await expect(group).not.toBeChecked();
  expect(unchecked.text).toContain("non coche");
  await reachControl(
    nvda,
    actor.getByTestId("actor-firstname-input"),
    "Prénom",
    info,
  );
  await nvda.press("Control+a", { capture: true });
  await captureStep(
    nvda,
    "actor-firstname-native-draft",
    () => nvda.type("Prenom modifie fictivement", { capture: true }),
    info,
  );
  await reachControl(
    nvda,
    actor.getByTestId("actor-lastname-input"),
    "Nom",
    info,
  );
  await reachControl(
    nvda,
    actor.getByTestId("actor-submit-btn"),
    "Enregistrer",
    info,
  );
  let dialogEvent = page.waitForEvent("dialog");
  const confirmationSpeech = await activateCurrent(
    nvda,
    info,
    "actor-native-confirm-open-refusal",
  );
  const confirmation = await dialogEvent;
  expect(confirmation.type()).toBe("confirm");
  expect(confirmation.message()).toContain(
    "Confirmer la modification des coordonnées de cet acteur",
  );
  expect(
    confirmationSpeech.text +
      (await currentFocus(nvda, info, "actor-native-confirm-focus")).text,
  ).toContain("confirmer la modification");
  await captureStep(
    nvda,
    "actor-native-confirm-escape",
    () => nvda.press("Escape", { capture: true }),
    info,
  );
  expect(
    network.applicationCalls.filter((call) => call.method === "PATCH"),
  ).toHaveLength(0);
  await expect(actor.getByTestId("actor-firstname-input")).toHaveValue(
    "Prenom modifie fictivement",
  );
  await expect(actor.getByTestId("actor-submit-btn")).toBeFocused();
  dialogEvent = page.waitForEvent("dialog");
  await activateCurrent(nvda, info, "actor-native-confirm-open-agreement");
  await dialogEvent;
  const saveError = await captureStep(
    nvda,
    "actor-native-confirm-accept-and-500",
    () => nvda.press("Enter", { capture: true }),
    info,
  );
  await expect(actor.getByTestId("actor-form-error")).toContainText(
    "Votre saisie est conservée",
  );
  expect(saveError.text).toContain("votre saisie est conservee");
  await expect(actor.getByTestId("actor-submit-btn")).toBeFocused();
  await reachControl(
    nvda,
    actor.getByTestId("actor-cancel-btn"),
    "Annuler",
    info,
  );
  await activateCurrent(nvda, info, "actor-real-dialog-cancel");
  await expect(actor).not.toBeVisible();
  await expect(opener).toBeFocused();
  expect(
    (await currentFocus(nvda, info, "actor-return-to-opener")).text,
  ).toContain("modifier");

  await reachControl(
    nvda,
    page.getByTestId("technology-add-btn"),
    "Ajouter",
    info,
  );
  const technologyOpening = await activateCurrent(
    nvda,
    info,
    "technology-real-dialog-open",
  );
  const technology = page.getByRole("dialog", {
    name: "Ajouter une technologie",
    exact: true,
  });
  await expect(technology).toBeVisible();
  expect(technologyOpening.text).toMatch(
    /technologie.*dialogue|dialogue.*technologie/,
  );
  await reachControl(
    nvda,
    technology.getByTestId("technology-name-input"),
    "Technologie",
    info,
  );
  await nvda.type("Base fictive", { capture: true });
  await reachControl(
    nvda,
    technology.getByTestId("technology-product-input"),
    "Produit",
    info,
  );
  await nvda.type("Produit hors catalogue fictif", { capture: true });
  await expect(
    technology.getByTestId("technology-product-unknown-hint"),
  ).toBeVisible();
  await captureStep(
    nvda,
    "technology-leave-product-native",
    () => nvda.press("Tab", { capture: true }),
    info,
  );
  const productSpeech = await captureStep(
    nvda,
    "technology-unknown-product-description",
    () => nvda.press("Shift+Tab", { capture: true }),
    info,
  );
  await expect(
    technology.getByTestId("technology-product-input"),
  ).toBeFocused();
  expect(productSpeech.text).toContain("produit");
  expect(productSpeech.text).toContain("non suivi");
  for (const [id, name] of [
    ["technology-version-input", "Version"],
    ["technology-manual-eol-input", "Fin de vie"],
    ["technology-docurl-input", "Documentation"],
  ] as const) {
    await reachControl(nvda, technology.getByTestId(id), name, info);
  }
  await reachControl(
    nvda,
    technology.getByTestId("technology-submit-btn"),
    "Enregistrer",
    info,
  );
  const technologyError = await activateCurrent(
    nvda,
    info,
    "technology-simulated-500-status",
  );
  await expect(technology).not.toBeVisible();
  await expect(page.getByTestId("technology-status")).toContainText(
    "Erreur de technologie entièrement simulée",
  );
  expect(technologyError.text).toContain("erreur de technologie");
  await expect(page.getByTestId("technology-add-btn")).toBeFocused();
  await finishApplicationScene(page, network, info);
});

test("AT-APP-Donnees — création conditionnelle, famille refusée, données/exposition500 et focus conservé", async ({
  page,
  browser,
  nvda,
}, info) => {
  const network = await simulatedApplicationNetwork(page);
  await page.goto(network.base);
  const host = await mountApplicationScene(page, "data");
  await info.attach("application-production-host", {
    body: Buffer.from(JSON.stringify(host)),
    contentType: "application/json",
  });
  await attachIdentity(nvda, browser.version(), info);
  await focusDocumentStart(page, nvda);
  await reachControl(
    nvda,
    page.getByTestId("data-application-add-btn"),
    "Ajouter",
    info,
  );
  const opening = await activateCurrent(nvda, info, "data-real-dialog-open");
  const data = page.getByRole("dialog", {
    name: "Rattacher une donnée",
    exact: true,
  });
  await expect(data).toBeVisible();
  expect(opening.text).toMatch(
    /rattacher.*donnee.*dialogue|dialogue.*rattacher.*donnee/,
  );
  await reachControl(
    nvda,
    data.getByTestId("data-application-create-description-toggle"),
    "Créer une nouvelle donnée",
    info,
  );
  await activateCurrent(nvda, info, "data-create-description-branch");
  const name = data.getByTestId("new-description-name-input");
  await expect(name).toBeFocused();
  expect(
    (await currentFocus(nvda, info, "data-new-name-obligation")).text,
  ).toContain("nom de la donnee");
  await nvda.type("Nouvelle donnee fictive", { capture: true });
  await reachControl(
    nvda,
    data.getByTestId("new-description-create-family-toggle"),
    "Créer une nouvelle famille",
    info,
  );
  await activateCurrent(nvda, info, "data-new-family-branch");
  const family = data.getByTestId("new-family-path-input");
  await expect(family).toBeFocused();
  expect((await currentFocus(nvda, info, "data-family-name")).text).toContain(
    "chemin de la nouvelle famille",
  );
  await reachControl(
    nvda,
    data.getByTestId("new-family-add-btn"),
    "Ajouter",
    info,
  );
  const empty = await activateCurrent(
    nvda,
    info,
    "data-family-empty-native-validation",
  );
  await expect(family).toBeFocused();
  expect(empty.text).toContain("veuillez renseigner un chemin");
  await nvda.type("Test/Famille fictive", { capture: true });
  await reachControl(
    nvda,
    data.getByTestId("new-family-add-btn"),
    "Ajouter",
    info,
  );
  const familyError = await activateCurrent(
    nvda,
    info,
    "data-family-simulated-500",
  );
  await expect(family).toBeFocused();
  expect(familyError.text).toContain(
    "erreur lors de la creation de la famille",
  );
  await expect(family).toHaveValue("Test/Famille fictive");
  await reachControl(
    nvda,
    data.getByTestId("new-family-cancel-btn"),
    "Annuler",
    info,
  );
  await activateCurrent(nvda, info, "data-family-cancel");
  const reference = data.getByRole("checkbox", { name: /Donnée de référence/ });
  const referenceRole = await reachControl(
    nvda,
    reference,
    "Donnée de référence",
    info,
  );
  expect(referenceRole.text).toMatch(/case.*cocher/);
  const checked = await captureStep(
    nvda,
    "data-reference-native-check",
    () => nvda.press("Space", { capture: true }),
    info,
  );
  await expect(reference).toBeChecked();
  expect(checked.text).toMatch(/\bcochee?\b/);
  expect(checked.text).not.toContain("non coche");
  await reachControl(
    nvda,
    data.getByTestId("data-application-example-input"),
    "Exemple de valeur",
    info,
  );
  await nvda.type("Valeur fictive conservee", { capture: true });
  await reachControl(
    nvda,
    data.getByTestId("data-application-submit-btn"),
    "Rattacher",
    info,
  );
  const saveError = await activateCurrent(
    nvda,
    info,
    "data-application-simulated-500",
  );
  await expect(data.getByTestId("data-application-submit-error")).toContainText(
    "enregistrement de la donnée",
  );
  expect(saveError.text).toContain("enregistrement de la donnee");
  await expect(name).toHaveValue("Nouvelle donnee fictive");
  await expect(data.getByTestId("data-application-example-input")).toHaveValue(
    "Valeur fictive conservee",
  );
  await expect(data.getByTestId("data-application-submit-btn")).toBeFocused();
  expect(
    network.applicationCalls.filter(
      (call) =>
        call.pathname.endsWith(
          `/applications/11111111-1111-4111-8111-111111111111`,
        ) && call.method === "POST",
    ),
  ).toHaveLength(1);
  await reachControl(
    nvda,
    data.getByTestId("data-application-cancel-btn"),
    "Annuler",
    info,
  );
  await activateCurrent(nvda, info, "data-application-cancel");
  await expect(data).not.toBeVisible();
  await expect(page.getByTestId("data-application-add-btn")).toBeFocused();

  await reachControl(
    nvda,
    page.getByTestId("data-exposure-add-btn"),
    "Ajouter",
    info,
  );
  const exposureOpening = await activateCurrent(
    nvda,
    info,
    "data-exposure-real-open",
  );
  const exposure = page.getByRole("dialog", {
    name: "Ajouter une exposition",
    exact: true,
  });
  await expect(exposure).toBeVisible();
  expect(exposureOpening.text).toMatch(
    /exposition.*dialogue|dialogue.*exposition/,
  );
  await reachControl(
    nvda,
    exposure.getByTestId("data-exposure-type-input"),
    "Type",
    info,
  );
  await nvda.type("API fictive", { capture: true });
  for (const [id, label] of [
    ["data-exposure-format-input", "Format"],
    ["data-exposure-endpoint-input", "Point de terminaison technique"],
    ["data-exposure-url-input", "URL d'accès à la ressource"],
    ["data-exposure-swagger-url-input", "URL Swagger"],
    ["data-exposure-authentication-type-input", "Type d'authentification"],
  ] as const) {
    const field = await reachControl(
      nvda,
      exposure.getByTestId(id),
      label,
      info,
    );
    expect(field.text).toMatch(/edition/);
    if (id === "data-exposure-format-input")
      await nvda.type("JSON", { capture: true });
  }
  await reachControl(
    nvda,
    exposure.getByTestId("data-exposure-submit-btn"),
    "Ajouter",
    info,
  );
  const exposureError = await activateCurrent(
    nvda,
    info,
    "data-exposure-simulated-500",
  );
  await expect(
    exposure.getByTestId("data-exposure-submit-error"),
  ).toContainText("enregistrement de l'exposition");
  expect(exposureError.text).toContain(
    normalizeSpeech("enregistrement de l'exposition"),
  );
  await expect(exposure.getByTestId("data-exposure-type-input")).toHaveValue(
    "API fictive",
  );
  await expect(exposure.getByTestId("data-exposure-submit-btn")).toBeFocused();
  await reachControl(
    nvda,
    exposure.getByTestId("data-exposure-cancel-btn"),
    "Annuler",
    info,
  );
  await activateCurrent(nvda, info, "data-exposure-cancel");
  await expect(exposure).not.toBeVisible();
  await expect(page.getByTestId("data-exposure-add-btn")).toBeFocused();
  await finishApplicationScene(page, network, info);
});

test("AT-APP-Signalements — note500 locale, refus du statut sans deuxième appel et réessai réussi", async ({
  page,
  browser,
  nvda,
}, info) => {
  const network = await simulatedApplicationNetwork(page);
  await page.goto(network.base);
  const host = await mountApplicationScene(page, "reports");
  await info.attach("application-production-host", {
    body: Buffer.from(JSON.stringify(host)),
    contentType: "application/json",
  });
  await attachIdentity(nvda, browser.version(), info);
  await focusDocumentStart(page, nvda);
  await reachControl(
    nvda,
    page.getByRole("button", { name: "Modifier", exact: true }),
    "Modifier",
    info,
  );
  await activateCurrent(nvda, info, "reports-table-edit-mode");
  const opener = page.getByTestId("actor-edit-notes");
  const noteName = await reachControl(
    nvda,
    opener,
    "Modifier la note du signalement",
    info,
  );
  expect(noteName.text).toContain("signalement entierement fictif");
  const opening = await activateCurrent(nvda, info, "report-note-real-open");
  const note = page.getByRole("dialog", {
    name: "Modifier la note du signalement",
    exact: true,
  });
  await expect(note).toBeVisible();
  expect(opening.text).toMatch(
    /note.*signalement.*dialogue|dialogue.*note.*signalement/,
  );
  const textbox = note.getByRole("textbox");
  const initial = await reachControl(
    nvda,
    textbox,
    "Note du signalement",
    info,
  );
  expect(initial.text).toContain("note initiale fictive");
  await nvda.press("Control+a", { capture: true });
  await nvda.type("Note modifiee fictivement", { capture: true });
  await reachControl(
    nvda,
    note.getByTestId("valid-dialog-button"),
    "Valider",
    info,
  );
  const error = await activateCurrent(
    nvda,
    info,
    "report-note-simulated-500-local",
  );
  await expect(note.getByTestId("report-note-error")).toContainText(
    "Erreur lors de l'enregistrement de la note",
  );
  expect(error.text).toContain(
    normalizeSpeech("erreur lors de l'enregistrement de la note"),
  );
  await expect(textbox).toHaveValue("Note modifiee fictivement");
  await expect(note.getByTestId("valid-dialog-button")).toBeFocused();
  expect(
    network.applicationCalls.filter((call) => call.method === "PATCH"),
  ).toHaveLength(1);
  await reachControl(
    nvda,
    note.getByRole("button", { name: "Fermer", exact: true }),
    "Fermer",
    info,
  );
  await activateCurrent(nvda, info, "report-note-close-after-500");
  await expect(note).not.toBeVisible();
  await expect(opener).toBeFocused();
  const status = page.locator(`#report-status-${appFixtureIds.report}`);
  const before = await reachControl(
    nvda,
    status,
    "Statut du signalement",
    info,
  );
  expect(before.text).toMatch(/liste|combo/);
  expect(before.text).toContain("en attente");
  const statusError = await captureStep(
    nvda,
    "report-status-simulated-500-rollback",
    async () => {
      await nvda.press("Home", { capture: true });
      await nvda.press("ArrowDown", { capture: true });
    },
    info,
  );
  await expect(status).toHaveValue("in_pending");
  expect(statusError.text).toContain("erreur lors de la mise a jour du statut");
  await expect(status).toBeFocused();
  expect(
    (await currentFocus(nvda, info, "report-status-after-rollback")).text,
  ).toContain("en attente");
  expect(
    network.applicationCalls.filter((call) => call.method === "PATCH"),
  ).toHaveLength(2);
  network.applicationState.reportMode = "success";
  await reachControl(nvda, opener, "Modifier la note", info);
  await activateCurrent(nvda, info, "report-note-retry-open");
  await reachControl(nvda, textbox, "Note du signalement", info);
  await nvda.press("Control+a", { capture: true });
  await nvda.type("Note reessayee fictive", { capture: true });
  await reachControl(
    nvda,
    note.getByTestId("valid-dialog-button"),
    "Valider",
    info,
  );
  await activateCurrent(nvda, info, "report-note-simulated-success");
  await expect(note).not.toBeVisible();
  await expect(
    page
      .getByTestId("issues-table")
      .getByText("Note reessayee fictive", { exact: true }),
  ).toBeVisible();
  expect(
    network.applicationCalls.filter((call) => call.method === "PATCH"),
  ).toHaveLength(3);
  await finishApplicationScene(page, network, info);
});
