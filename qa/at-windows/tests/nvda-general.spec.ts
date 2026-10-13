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
import { alpha } from "./interactive-utils.js";
import {
  finishGeneral,
  generalNetwork,
  optionText,
} from "./general-interactive-utils.js";

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

// DOM reads identify a particular control and choose the direction; only native
// Tab/Shift+Tab moves focus. A date label is checked on its own arrival plus
// current-focus report, never against all preceding speech in the scene.
async function reach(
  nvda: NVDAPlaywright,
  target: Locator,
  name: string,
  info: TestInfo,
) {
  await expect(target).toBeVisible();
  const direction = await target.evaluate((element) => {
    const active = document.activeElement;
    return active &&
      active !== document.body &&
      active.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_PRECEDING
      ? "Shift+Tab"
      : "Tab";
  });
  const visited: string[] = [];
  let arrival: Awaited<ReturnType<typeof captureStep>> | undefined;
  for (let index = 0; index <= 80; index++) {
    if (
      await target.evaluate(
        (element) =>
          element === document.activeElement ||
          element.contains(document.activeElement),
      )
    ) {
      if (!arrival) {
        arrival = await captureStep(
          nvda,
          "general-native-join-tab-stop",
          async () => {
            await nvda.press(direction === "Tab" ? "Shift+Tab" : "Tab", {
              capture: true,
            });
            await nvda.press(direction, { capture: true });
          },
          info,
        );
        await expect(target).toBeFocused();
      }
      const report = await currentFocus(nvda, info, `general-current-${index}`);
      const phrases = [...arrival.phrases, ...report.phrases];
      const observed = { phrases, text: normalizeSpeech(phrases.join(" ")) };
      expect(observed.text).toContain(normalizeSpeech(name));
      return observed;
    }
    arrival = await captureStep(
      nvda,
      `general-native-${direction}-${index}`,
      () => nvda.press(direction, { capture: true }),
      info,
    );
    visited.push(arrival.text);
  }
  throw new Error(
    `Commande non atteinte par tabulation native : ${name}. Annonces : ${JSON.stringify(visited)}`,
  );
}

async function typeDraft(
  nvda: NVDAPlaywright,
  value: string,
  info: TestInfo,
  step: string,
) {
  return captureStep(
    nvda,
    step,
    async () => {
      await nvda.press("Control+a", { capture: true });
      await nvda.type(value, { capture: true });
    },
    info,
  );
}

async function selectValue(
  nvda: NVDAPlaywright,
  target: Locator,
  value: string,
  info: TestInfo,
  step: string,
) {
  const label = await target.locator(`option[value="${value}"]`).innerText();
  await captureStep(
    nvda,
    `${step}-home`,
    () => nvda.press("Home", { capture: true }),
    info,
  );
  for (let index = 0; index <= 20; index++) {
    if ((await target.inputValue()) === value) {
      const selected = await currentFocus(nvda, info, `${step}-selected-value`);
      // Native French synthesis spells the observed priority codes R3/H0.
      const spokenLabel = normalizeSpeech(label).replace(
        /\b([rh])(?=\d)/g,
        "$1 ",
      );
      expect(selected.text).toContain(spokenLabel);
      return selected;
    }
    await captureStep(
      nvda,
      `${step}-arrow-${index}`,
      () => nvda.press("ArrowDown", { capture: true }),
      info,
    );
  }
  throw new Error(`Option non sélectionnée au clavier natif : ${value}`);
}

test.use({ serviceWorkers: "block" });
test.beforeEach(async ({}, info) => {
  info.setTimeout(900_000);
  info.annotations.push({
    type: "RGAA",
    description:
      "7.1.2 — U08 : Infos/Labels/Hébergements/Statuts/Dette IT réels ; API et session locales fictives ; aucune clôture d’autres variantes par simple ressemblance",
  });
});

test("AT-U08-InfosLabels — édition application et datalist de source, refus500 puis succès simulés", async ({
  page,
  browser,
  nvda,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const network = await generalNetwork(page);
  await page.goto(`${network.base}/applications/${alpha}/tab-infos`);
  await expect(page.getByTestId("informations-generales")).toBeVisible();
  await attachIdentity(nvda, browser.version(), info);
  await focusDocumentStart(page, nvda);
  const editOpener = page.getByTestId("info-edit-btn");
  await reach(nvda, editOpener, "Modifier", info);
  const opened = await activateCurrent(
    nvda,
    info,
    "general-edit-application-open",
  );
  const edit = page.getByRole("dialog", {
    name: "Modifier l'application",
    exact: true,
  });
  await expect(edit).toBeVisible();
  expect(opened.text).toContain(normalizeSpeech("Modifier l'application"));
  expect(opened.text).toMatch(/dialogue|dialog/);
  await reach(
    nvda,
    edit.getByTestId("application-shortname"),
    "Nom court",
    info,
  );
  await typeDraft(nvda, "U08 FICTIF", info, "general-edit-short-name");
  await reach(
    nvda,
    edit.getByTestId("application-type"),
    "Type d'application",
    info,
  );
  await selectValue(
    nvda,
    edit.getByTestId("application-type"),
    "core_service",
    info,
    "general-native-application-type",
  );
  await reach(
    nvda,
    edit.getByTestId("application-priority-restart"),
    "Priorité de redémarrage",
    info,
  );
  await selectValue(
    nvda,
    edit.getByTestId("application-priority-restart"),
    "R3",
    info,
    "general-native-priority",
  );
  const submit = edit.getByTestId("application-submit-btn");
  await reach(nvda, submit, "Enregistrer", info);
  const refused = await activateCurrent(
    nvda,
    info,
    "general-edit500-local-error",
  );
  await expect(edit.getByTestId("application-save-error")).toContainText(
    "Enregistrement fictif refusé",
  );
  expect(refused.text).toContain("enregistrement fictif refuse");
  await expect(edit.getByTestId("application-shortname")).toHaveValue(
    "U08 FICTIF",
  );
  await expect(submit).toBeFocused();
  await expect(
    page
      .getByTestId("app-toaster")
      .getByRole("alert")
      .filter({ hasText: "Enregistrement fictif refusé" }),
  ).toHaveCount(0);
  network.generalState.app = "success";
  const saved = await activateCurrent(nvda, info, "general-edit-retry-success");
  await expect(edit).not.toBeVisible();
  await expect(page.getByTestId("info-short-name")).toHaveText("U08 FICTIF");
  await expect(editOpener).toBeFocused();
  expect(saved.text).toContain("application mise a jour avec succes");

  const labelOpener = page.getByTestId("info-add-label-btn");
  await reach(nvda, labelOpener, "Ajouter", info);
  const labelOpened = await activateCurrent(
    nvda,
    info,
    "general-label-create-open",
  );
  const label = page.getByRole("dialog", {
    name: "Créer un nom alternatif",
    exact: true,
  });
  await expect(label).toBeVisible();
  expect(labelOpened.text).toContain("creer un nom alternatif");
  await reach(nvda, label.getByTestId("label-value-input"), "Valeur", info);
  await typeDraft(nvda, "Nouveau nom AT", info, "general-label-value-native");
  const source = label.getByTestId("label-source-search-input");
  await reach(nvda, source, "Source de noms", info);
  await typeDraft(nvda, "Source", info, "general-label-source-prefix");
  const sourceSelection = await captureStep(
    nvda,
    "general-native-source-datalist-option",
    async () => {
      await nvda.press("ArrowDown", { capture: true });
      await nvda.press("Enter", { capture: true });
    },
    info,
  );
  await expect(source).toHaveValue("Source fictive AT");
  expect(sourceSelection.text).toContain("source fictive at");
  expect(
    network.generalCalls.filter(
      (call) => call.method === "POST" && call.pathname.endsWith("/labels"),
    ),
  ).toHaveLength(0);
  await reach(nvda, label.getByTestId("label-submit-btn"), "Créer", info);
  const labelError = await activateCurrent(
    nvda,
    info,
    "general-label500-local-error",
  );
  await expect(label.getByTestId("label-form-error")).toContainText(
    "Votre saisie est conservée",
  );
  expect(labelError.text).toContain("votre saisie est conservee");
  await expect(label.getByTestId("label-value-input")).toHaveValue(
    "Nouveau nom AT",
  );
  await expect(source).toHaveValue("Source fictive AT");
  await expect(label.getByTestId("label-submit-btn")).toBeFocused();
  network.generalState.label = "success";
  const labelCreated = await activateCurrent(
    nvda,
    info,
    "general-label-create-success",
  );
  await expect(label).not.toBeVisible();
  await expect(page.getByTestId("info-labels")).toContainText("Nouveau nom AT");
  await expect(labelOpener).toBeFocused();
  expect(labelCreated.text).toContain("nom alternatif cree avec succes");
  const labelEditOpener = page.getByTestId("label-edit-btn").first();
  await reach(nvda, labelEditOpener, "Modifier", info);
  await activateCurrent(nvda, info, "general-label-edit-open");
  const editLabel = page.getByRole("dialog", {
    name: "Modifier un nom alternatif",
    exact: true,
  });
  await reach(nvda, editLabel.getByTestId("label-value-input"), "Valeur", info);
  await typeDraft(
    nvda,
    "Nom initial modifie AT",
    info,
    "general-label-edit-draft",
  );
  await reach(
    nvda,
    editLabel.getByTestId("label-submit-btn"),
    "Modifier",
    info,
  );
  const labelUpdated = await activateCurrent(
    nvda,
    info,
    "general-label-update-success",
  );
  await expect(editLabel).not.toBeVisible();
  await expect(page.getByTestId("info-labels")).toContainText(
    "Nom initial modifie AT",
  );
  await expect(labelEditOpener).toBeFocused();
  expect(labelUpdated.text).toContain("nom alternatif mis a jour avec succes");
  expect(errors).toEqual([]);
  await finishGeneral(page, network, info);
});

test("AT-U08-HostingStatus — catalogue natif, état, date, créations/éditions et refus simulés", async ({
  page,
  browser,
  nvda,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const network = await generalNetwork(page);
  await page.goto(`${network.base}/applications/${alpha}/tab-infos`);
  await expect(page.getByTestId("informations-generales")).toBeVisible();
  await attachIdentity(nvda, browser.version(), info);
  await focusDocumentStart(page, nvda);
  const opener = page.getByTestId("info-add-hosting-btn");
  await reach(nvda, opener, "Ajouter", info);
  const opening = await activateCurrent(
    nvda,
    info,
    "general-hosting-create-open",
  );
  const hosting = page.getByRole("dialog", {
    name: "Créer un hébergement",
    exact: true,
  });
  await expect(hosting).toBeVisible();
  expect(opening.text).toContain("creer un hebergement");
  await reach(nvda, hosting.getByTestId("hosting-label-input"), "Label", info);
  await typeDraft(nvda, "Nouveau site AT", info, "general-hosting-label");
  const option = hosting.getByTestId("hosting-option-search-input");
  await reach(nvda, option, "Option d'hébergement", info);
  await typeDraft(nvda, "Fournisseur", info, "general-hosting-catalog-prefix");
  const selected = await captureStep(
    nvda,
    "general-native-hosting-datalist-option",
    async () => {
      await nvda.press("ArrowDown", { capture: true });
      await nvda.press("Enter", { capture: true });
    },
    info,
  );
  await expect(option).toHaveValue(optionText);
  expect(selected.text).toContain("fournisseur at");
  expect(
    network.generalCalls.filter(
      (call) => call.method === "POST" && call.pathname.endsWith("/hostings"),
    ),
  ).toHaveLength(0);
  const active = hosting.getByTestId("hosting-is-active-toggle");
  await reach(nvda, active, "Statut de l'hébergement", info);
  await selectValue(
    nvda,
    active,
    "false",
    info,
    "general-hosting-passive-state",
  );
  await reach(nvda, hosting.getByTestId("hosting-submit-btn"), "Créer", info);
  const failure = await activateCurrent(
    nvda,
    info,
    "general-hosting500-local-error",
  );
  await expect(hosting.getByTestId("hosting-form-error")).toContainText(
    "Votre saisie est conservée",
  );
  expect(failure.text).toContain("votre saisie est conservee");
  await expect(hosting.getByTestId("hosting-label-input")).toHaveValue(
    "Nouveau site AT",
  );
  await expect(active).toHaveValue("false");
  await expect(hosting.getByTestId("hosting-submit-btn")).toBeFocused();
  network.generalState.hosting = "success";
  const success = await activateCurrent(
    nvda,
    info,
    "general-hosting-create-success",
  );
  await expect(hosting).not.toBeVisible();
  await expect(page.getByTestId("info-hostings")).toContainText(
    "Nouveau site AT",
  );
  await expect(opener).toBeFocused();
  expect(success.text).toContain("hebergement cree avec succes");
  const editOpener = page.getByTestId("hosting-edit-btn").first();
  await reach(nvda, editOpener, "Modifier", info);
  await activateCurrent(nvda, info, "general-hosting-edit-open");
  const editHosting = page.getByRole("dialog", {
    name: "Modifier un hébergement",
    exact: true,
  });
  await reach(
    nvda,
    editHosting.getByTestId("hosting-label-input"),
    "Label",
    info,
  );
  await typeDraft(
    nvda,
    "Hebergement initial modifie AT",
    info,
    "general-hosting-edit-draft",
  );
  await reach(
    nvda,
    editHosting.getByTestId("hosting-submit-btn"),
    "Modifier",
    info,
  );
  const updated = await activateCurrent(
    nvda,
    info,
    "general-hosting-update-success",
  );
  await expect(editHosting).not.toBeVisible();
  await expect(page.getByTestId("info-hostings")).toContainText(
    "Hebergement initial modifie AT",
  );
  await expect(editOpener).toBeFocused();
  expect(updated.text).toContain("hebergement mis a jour avec succes");

  await page.goto(`${network.base}/applications/${alpha}/tab-statuses`);
  await expect(page.getByTestId("statuses-table")).toBeVisible();
  await focusDocumentStart(page, nvda);
  const statusOpener = page.getByTestId("add-status-btn");
  await reach(nvda, statusOpener, "Ajouter un nouveau statut", info);
  await activateCurrent(nvda, info, "general-status-create-open");
  const status = page.getByRole("dialog", {
    name: "Ajouter un statut",
    exact: true,
  });
  await reach(nvda, status.getByTestId("status-select"), "Statut", info);
  await selectValue(
    nvda,
    status.getByTestId("status-select"),
    "decommissioned",
    info,
    "general-status-native-selection",
  );
  await reach(
    nvda,
    status.getByTestId("status-version-input"),
    "Version",
    info,
  );
  await typeDraft(nvda, "Version AT", info, "general-status-version-draft");
  const date = status.getByTestId("status-date-input");
  await reach(nvda, date, "Date du statut", info);
  // Fixture date setup does not qualify Windows segment input; native arrival
  // and the actual date's accessible label remain required above.
  await date.fill("2026-10-13");
  await reach(
    nvda,
    status.getByTestId("status-submit-btn"),
    "Enregistrer",
    info,
  );
  const refused = await activateCurrent(
    nvda,
    info,
    "general-status500-local-error",
  );
  await expect(status.getByTestId("status-form-error")).toContainText(
    "Votre saisie est conservée",
  );
  expect(refused.text).toContain("votre saisie est conservee");
  await expect(date).toHaveValue("2026-10-13");
  await expect(status.getByTestId("status-submit-btn")).toBeFocused();
  network.generalState.status = "success";
  const saved = await activateCurrent(
    nvda,
    info,
    "general-status-create-success",
  );
  await expect(status).not.toBeVisible();
  await expect(page.getByTestId("statuses-table")).toContainText("Version AT");
  await expect(statusOpener).toBeFocused();
  expect(saved.text).toContain("statut cree avec succes");
  const statusEditOpener = page.getByTestId("status-edit-btn").first();
  await reach(nvda, statusEditOpener, "Modifier le statut", info);
  await activateCurrent(nvda, info, "general-status-edit-open");
  const editStatus = page.getByRole("dialog", {
    name: "Modifier un statut",
    exact: true,
  });
  await reach(
    nvda,
    editStatus.getByTestId("status-version-input"),
    "Version",
    info,
  );
  await typeDraft(
    nvda,
    "Version initiale modifiee AT",
    info,
    "general-status-edit-draft",
  );
  await reach(
    nvda,
    editStatus.getByTestId("status-submit-btn"),
    "Enregistrer",
    info,
  );
  const statusUpdated = await activateCurrent(
    nvda,
    info,
    "general-status-update-success",
  );
  await expect(editStatus).not.toBeVisible();
  await expect(statusEditOpener).toBeFocused();
  expect(statusUpdated.text).toContain("statut modifie avec succes");
  network.generalState.status = "error";
  await reach(
    nvda,
    page.getByTestId("status-delete-btn").first(),
    "Supprimer ce statut",
    info,
  );
  await activateCurrent(nvda, info, "general-status-delete-open");
  const deletion = page.getByRole("dialog", {
    name: "Supprimer un statut",
    exact: true,
  });
  await reach(
    nvda,
    deletion.getByRole("button", { name: "Supprimer", exact: true }),
    "Supprimer",
    info,
  );
  const deletionError = await activateCurrent(
    nvda,
    info,
    "general-status-delete500-context-observation",
  );
  await expect(deletion).toBeVisible();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Erreur lors de la suppression du statut" }),
  ).toBeVisible();
  // The error is currently global. Only this native capture can establish its
  // restitution from the modal; the DOM placement alone did not establish a NC.
  expect(deletionError.text).toContain(
    "erreur lors de la suppression du statut",
  );
  await reach(
    nvda,
    deletion.getByRole("button", { name: "Annuler", exact: true }),
    "Annuler",
    info,
  );
  await activateCurrent(nvda, info, "general-status-delete-cancel");
  await expect(deletion).not.toBeVisible();
  await expect(page.getByTestId("status-delete-btn").first()).toBeFocused();
  expect(errors).toEqual([]);
  await finishGeneral(page, network, info);
});

test("AT-U08-Dette — catalogue tardif, scores décimaux, refus500 et réessai réels simulés", async ({
  page,
  browser,
  nvda,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const network = await generalNetwork(page);
  network.generalState.holdCampaigns = true;
  await page.goto(`${network.base}/applications/${alpha}/tab-infos`);
  await expect(page.getByTestId("informations-generales")).toBeVisible();
  await attachIdentity(nvda, browser.version(), info);
  await focusDocumentStart(page, nvda);
  const opener = page.getByTestId("technical-debt-edit-btn");
  await reach(nvda, opener, "Modifier", info);
  const opened = await activateCurrent(
    nvda,
    info,
    "general-debt-open-held-catalog",
  );
  const debt = page.getByRole("dialog", {
    name: "Modifier la dette technique",
    exact: true,
  });
  await expect(debt).toBeVisible();
  expect(opened.text).toContain("modifier la dette technique");
  await expect.poll(() => network.campaignPending()).toBe(true);
  const campaignFailure = await captureStep(
    nvda,
    "general-debt-campaign-timeout",
    async () => {
      await nvda.capture(
        async () => {
          await expect(
            debt.getByTestId("technical-debt-campaigns-error"),
          ).toContainText("Impossible de charger les campagnes", {
            timeout: 15000,
          });
        },
        { capture: true },
      );
    },
    info,
  );
  expect(`${opened.text} ${campaignFailure.text}`).toContain(
    "impossible de charger les campagnes de dette it",
  );

  const year = debt.getByTestId("millesime-select");
  await reach(nvda, year, "Millésime", info);
  expect(
    (await currentFocus(nvda, info, "general-debt-current-year")).text,
  ).toContain("2026");
  const technical = debt.getByTestId("technical-maturity-select");
  await reach(nvda, technical, "Maturité technique", info);
  await typeDraft(nvda, "4.25", info, "general-debt-technical-score-draft");
  await expect(technical).toHaveValue("4.25");
  network.generalState.holdCampaigns = false;
  network.releaseCampaigns();
  await expect.poll(() => network.campaignPending()).toBe(false);
  await expect(technical).toBeFocused();
  const retryCampaigns = debt.getByTestId("technical-debt-campaigns-retry");
  await reach(
    nvda,
    retryCampaigns,
    "Réessayer le chargement des campagnes",
    info,
  );
  await activateCurrent(nvda, info, "general-debt-campaign-retry");
  await expect(retryCampaigns).toHaveCount(0);
  await expect(year).toBeFocused();
  await expect(technical).toHaveValue("4.25");
  expect(
    (await currentFocus(nvda, info, "general-debt-focus-after-catalog")).text,
  ).toContain("millesime");
  await reach(
    nvda,
    debt.getByTestId("business-maturity-select"),
    "Maturité métier",
    info,
  );
  await typeDraft(nvda, "3.5", info, "general-debt-business-score-draft");
  await reach(
    nvda,
    debt.getByTestId("cost-containment-select"),
    "Maîtrise des coûts",
    info,
  );
  await typeDraft(nvda, "2.75", info, "general-debt-cost-score-draft");
  const submit = debt.getByTestId("technical-debt-submit-btn");
  await reach(nvda, submit, "Modifier", info);
  const error = await activateCurrent(
    nvda,
    info,
    "general-debt500-local-error",
  );
  await expect(debt.getByTestId("technical-debt-form-error")).toContainText(
    "Votre saisie est conservée",
  );
  expect(error.text).toContain("votre saisie est conservee");
  await expect(technical).toHaveValue("4.25");
  await expect(submit).toBeFocused();
  network.generalState.debt = "success";
  const success = await activateCurrent(
    nvda,
    info,
    "general-debt-update-success",
  );
  await expect(debt).not.toBeVisible();
  await expect(opener).toBeFocused();
  await expect(page.getByTestId("technicalMaturity-badge")).toContainText(
    "4.25/5",
  );
  expect(success.text).toContain(
    "informations de dette technique mises a jour avec succes",
  );
  expect(errors).toEqual([]);
  await finishGeneral(page, network, info);
});
