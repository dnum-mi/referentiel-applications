import { expect, type Locator, type TestInfo } from "@playwright/test";
import type { NVDAPlaywright } from "@guidepup/playwright";
import {
  test,
  attachIdentity,
  captureStep,
  focusDocumentStart,
  normalizeSpeech,
} from "./fixture.js";
import { activateCurrent, tabTo } from "./native-utils.js";
import {
  complianceBranches,
  finishRemaining,
  mountRemainingScene,
  simulatedRemainingNetwork,
} from "./remaining-interactive-utils.js";

// The native Tab key is the only action that changes focus. The DOM selects a
// particular repeated control; its native name must still be spoken and recorded.
async function reachControl(
  nvda: NVDAPlaywright,
  target: Locator,
  name: string,
  info: TestInfo,
) {
  await expect(target).toBeVisible();
  for (let index = 0; index <= 60; index++) {
    if (
      await target.evaluate(
        (element) =>
          element === document.activeElement ||
          element.contains(document.activeElement),
      )
    ) {
      const observed = await captureStep(
        nvda,
        `remaining-focus-${index}`,
        () =>
          nvda.perform(nvda.keyboardCommands.reportCurrentFocus, {
            capture: true,
          }),
        info,
      );
      expect(observed.text).toContain(normalizeSpeech(name));
      return observed;
    }
    await captureStep(
      nvda,
      `remaining-native-tab-${index}`,
      () => nvda.press("Tab", { capture: true }),
      info,
    );
  }
  throw new Error(`Commande réelle non atteinte par Tab natif : ${name}`);
}

test.use({ serviceWorkers: "block" });
test.beforeEach(async ({}, info) => {
  info.setTimeout(600_000);
  info.annotations.push({
    type: "RGAA",
    description:
      "7.1.2 — trois scènes manquantes ; périmètre et variantes dans matrix-34-cases.json, aucune qualification globale automatique",
  });
});

test("AT-REM-Conformites — six formulaires, homologation conditionnelle, alerte de sauvegarde et RGAA distinct", async ({
  page,
  browser,
  nvda,
}, info) => {
  const network = await simulatedRemainingNetwork(page);
  await page.goto(network.base);
  await mountRemainingScene(page, "compliances");
  await expect(page.getByTestId("compliance-edit-btn")).toHaveCount(6);
  await attachIdentity(nvda, browser.version(), info);
  await focusDocumentStart(page, nvda);
  const checkboxes = [
    "compliance-dima-hno",
    "compliance-dima-recovery-plan",
    "compliance-rgpd-aipd",
    "compliance-dsfr-implemented",
  ];
  for (let index = 0; index < complianceBranches.length; index++) {
    const branch = complianceBranches[index];
    const opener = page.getByTestId("compliance-edit-btn").nth(index);
    const role = await reachControl(nvda, opener, "Modifier", info);
    expect(role.text).toContain("bouton");
    const opened = await activateCurrent(
      nvda,
      info,
      `compliance-${branch.id}-open`,
    );
    const dialog = page.getByTestId("compliance-modal");
    await expect(dialog).toBeVisible();
    expect(opened.text).toMatch(/dialogue|dialog/);
    expect(opened.text).toContain("modifier");
    for (const [id, name] of branch.fields) {
      const target = checkboxes.includes(id)
        ? dialog.getByRole("checkbox", { name, exact: true })
        : dialog.getByTestId(id);
      const field = await reachControl(nvda, target, name, info);
      if (checkboxes.includes(id)) {
        expect(field.text).toMatch(/case.*cocher|interrupteur/);
        if (id === "compliance-dima-hno")
          expect(field.text).toContain("non coche");
        else {
          expect(field.text).toMatch(/\bcochee?\b/);
          expect(field.text).not.toContain("non coche");
        }
      } else if (!id.includes("date"))
        expect(field.text).toMatch(/edition|multiligne|liste|combo/);
    }
    if (branch.id === "homologation") {
      const status = dialog.getByTestId("compliance-homologation-status");
      await reachControl(nvda, status, "Statut d'homologation", info);
      const selected = await captureStep(
        nvda,
        "homologation-native-state-change",
        async () => {
          await nvda.press("Home", { capture: false });
          if ((await status.inputValue()) !== "homologuee")
            await nvda.press("ArrowDown", { capture: false });
          await nvda.perform(nvda.keyboardCommands.reportCurrentFocus, {
            capture: true,
          });
        },
        info,
      );
      await expect(status).toHaveValue("homologuee");
      expect(selected.text).toContain("homologuee");
      await reachControl(
        nvda,
        dialog.getByTestId("compliance-homologation-date-end"),
        "Date de fin d'homologation",
        info,
      );
    }
    if (branch.id === "eco_index") {
      await reachControl(
        nvda,
        dialog.getByTestId("ecoindex-target-url-input"),
        "URL cible EcoIndex",
        info,
      );
      await nvda.press("Control+a", { capture: false });
      const warning = await captureStep(
        nvda,
        "ecoindex-target-change-native-warning",
        () => nvda.type("https://changed.example.invalid"),
        info,
      );
      await expect(
        dialog.getByRole("alert").filter({ hasText: "réinitialisera" }),
      ).toContainText("réinitialisera");
      expect(warning.text).toContain("reinitialisera");
    }
    if (branch.id === "dima") {
      const impact = dialog.getByTestId("compliance-dima-business-impact");
      await reachControl(nvda, impact, "Impact métier", info);
      await nvda.press("Control+a", { capture: false });
      await nvda.type("Impact fictif modifié", { capture: false });
      await reachControl(
        nvda,
        dialog.getByTestId("compliance-submit-btn"),
        "Enregistrer",
        info,
      );
      const error = await activateCurrent(
        nvda,
        info,
        "compliance-real-save-simulated-500",
      );
      await expect(dialog.getByTestId("compliance-form-error")).toContainText(
        "Erreur lors de la modification de la conformité",
      );
      expect(error.text).toContain(
        "erreur lors de la modification de la conformite",
      );
      await expect(impact).toHaveValue("Impact fictif modifié");
      await expect(dialog.getByTestId("compliance-submit-btn")).toBeFocused();
    }
    await reachControl(
      nvda,
      dialog.getByTestId("compliance-cancel-btn"),
      "Annuler",
      info,
    );
    await activateCurrent(nvda, info, `compliance-${branch.id}-cancel`);
    await expect(dialog).not.toBeVisible();
    await expect(opener).toBeFocused();
  }
  await reachControl(nvda, page.getByTestId("rgaa-add-btn"), "Ajouter", info);
  await activateCurrent(nvda, info, "rgaa-real-form-open");
  const dialog = page.getByRole("dialog", {
    name: "Ajouter une conformité RGAA",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await reachControl(
    nvda,
    dialog.getByTestId("rgaa-form-service-url"),
    "URL du service",
    info,
  );
  await nvda.type("https://service.example.invalid", { capture: false });
  await reachControl(
    nvda,
    dialog.getByTestId("rgaa-form-accessibility-url"),
    "URL de la déclaration d'accessibilité",
    info,
  );
  await reachControl(
    nvda,
    dialog.getByTestId("rgaa-form-score"),
    "Score RGAA",
    info,
  );
  await nvda.type("55", { capture: false });
  await reachControl(
    nvda,
    dialog.getByTestId("rgaa-form-audit-date"),
    "Date d'audit",
    info,
  );
  await reachControl(
    nvda,
    dialog.getByTestId("rgaa-form-submit"),
    "Enregistrer",
    info,
  );
  const error = await activateCurrent(
    nvda,
    info,
    "rgaa-real-create-simulated-500",
  );
  expect(error.text).toContain(
    "erreur lors de la creation de la conformite rgaa",
  );
  await expect(dialog.getByTestId("rgaa-form-service-url")).toHaveValue(
    "https://service.example.invalid",
  );
  await expect(dialog.getByTestId("rgaa-form-submit")).toBeFocused();
  network.remainingState.rgaaMode = "success";
  const success = await activateCurrent(
    nvda,
    info,
    "rgaa-real-create-simulated-success",
  );
  await expect(dialog).not.toBeVisible();
  await expect(page.getByTestId("rgaa-add-btn")).toBeFocused();
  expect(success.text).toContain("conformite rgaa creee");
  await finishRemaining(page, network, info);
});

test("AT-REM-Permissions — trois cycles, priorité pressée, signalements et alerte locale de création", async ({
  page,
  browser,
  nvda,
}, info) => {
  const network = await simulatedRemainingNetwork(page);
  await page.goto(network.base);
  await mountRemainingScene(page, "permissions");
  await attachIdentity(nvda, browser.version(), info);
  await focusDocumentStart(page, nvda);
  const prefix = "app-perms-select-actor-type-synthetic-moa-";
  for (const [key, states] of [
    ["App", ["Write", "Read"]],
    ["Link", ["Read", "Write", "none"]],
    ["Metadata", ["Read", "none"]],
  ] as const) {
    const button = page.getByTestId(prefix + key);
    const role = await reachControl(nvda, button, "Sélection actuelle", info);
    expect(role.text).toContain("bouton");
    for (const state of states) {
      await activateCurrent(nvda, info, `permissions-${key}-${state}`);
      await expect(button).toHaveAttribute("data-state", state);
      const value = await captureStep(
        nvda,
        `permissions-${key}-${state}-spoken`,
        () =>
          nvda.perform(nvda.keyboardCommands.reportCurrentFocus, {
            capture: true,
          }),
        info,
      );
      expect(value.text).toContain(
        state === "Read"
          ? "selection actuelle lecture seule"
          : state === "Write"
            ? "selection actuelle lecture et ecriture"
            : "selection actuelle aucun droit",
      );
      expect(value.text).toContain("apres activation");
    }
  }
  const priority = page.getByTestId(prefix + "PriorityRestart");
  await reachControl(nvda, priority, "Écriture de la priorisation", info);
  await activateCurrent(nvda, info, "priority-right-enable");
  await expect(priority).toHaveAttribute("aria-pressed", "true");
  const pressed = await captureStep(
    nvda,
    "priority-right-pressed-native",
    () =>
      nvda.perform(nvda.keyboardCommands.reportCurrentFocus, { capture: true }),
    info,
  );
  expect(pressed.text).toContain("maitrise d ouvrage fictive");
  expect(pressed.text).toMatch(/enfonce|appuye|presse/);
  expect(pressed.text).not.toMatch(/\bnon (?:enfonce|appuye|presse)\b/);
  await activateCurrent(nvda, info, "priority-right-disable");
  await expect(priority).toHaveAttribute("aria-pressed", "false");
  const manage = page
    .getByTestId("report-permission-manage")
    .getByRole("checkbox");
  await reachControl(nvda, manage, "Gestion", info);
  const toggled = await captureStep(
    nvda,
    "report-permission-native-manage",
    () => nvda.press("Space", { capture: true }),
    info,
  );
  expect(toggled.text).toMatch(/\bcochee?\b|\bactive\b/);
  expect(toggled.text).not.toMatch(/\bnon (?:coche|active)|\bdecoche/);
  await expect(manage).toBeChecked();
  await expect(
    page.getByTestId("report-permission-read").getByRole("checkbox"),
  ).toBeDisabled();
  await expect(
    page.getByTestId("report-permission-post").getByRole("checkbox"),
  ).toBeDisabled();
  await nvda.press("Space", { capture: false });
  await reachControl(
    nvda,
    page.getByTestId("app-perms-create-actor-type-btn"),
    "Ajouter un type d'acteur",
    info,
  );
  await activateCurrent(nvda, info, "actor-type-real-form-open");
  const dialog = page.getByTestId("create-actor-type-modal");
  await expect(dialog).toBeVisible();
  await reachControl(
    nvda,
    dialog.getByTestId("create-actor-type-code-input"),
    "Code",
    info,
  );
  await nvda.type("FICTIF", { capture: false });
  await reachControl(
    nvda,
    dialog.getByTestId("create-actor-type-label-input"),
    "Libellé",
    info,
  );
  await nvda.type("Type fictif NVDA", { capture: false });
  await reachControl(
    nvda,
    dialog.getByTestId("create-actor-type-description-input"),
    "Description",
    info,
  );
  await reachControl(
    nvda,
    dialog.getByTestId("create-actor-type-submit-btn"),
    "Créer",
    info,
  );
  const error = await activateCurrent(
    nvda,
    info,
    "actor-type-real-handler-simulated-500",
  );
  expect(error.text).toContain("votre saisie est conservee");
  await expect(dialog.getByTestId("create-actor-type-code-input")).toHaveValue(
    "FICTIF",
  );
  await expect(
    dialog.getByTestId("create-actor-type-submit-btn"),
  ).toBeFocused();
  await reachControl(
    nvda,
    dialog.getByTestId("create-actor-type-cancel-btn"),
    "Annuler",
    info,
  );
  await activateCurrent(nvda, info, "actor-type-real-form-cancel");
  await expect(dialog).not.toBeVisible();
  expect(
    network.remainingCalls.filter((call) => call.method === "POST"),
  ).toHaveLength(1);
  await finishRemaining(page, network, info);
});

test("AT-REM-Wizard — étapes, validation, champs dynamiques et Annuler-Reprendre sans création métier", async ({
  page,
  browser,
  nvda,
}, info) => {
  const network = await simulatedRemainingNetwork(page);
  await page.goto(network.base);
  await mountRemainingScene(page, "wizard");
  await attachIdentity(nvda, browser.version(), info);
  await focusDocumentStart(page, nvda);
  await tabTo(nvda, "Suivant", info);
  const invalid = await activateCurrent(nvda, info, "wizard-empty-first-step");
  await expect(page.getByTestId("application-label")).toBeFocused();
  expect(invalid.text).toContain("obligatoire");
  await nvda.type("Application fictive Alpha", { capture: false });
  await reachControl(
    nvda,
    page.getByTestId("markdown-textarea"),
    "Description",
    info,
  );
  await nvda.type("Description fictive conservée", { capture: false });
  await tabTo(nvda, "Suivant", info);
  const details = await activateCurrent(nvda, info, "wizard-real-second-step");
  await expect(page.getByTestId("application-step-title-2")).toBeFocused();
  expect(details.text).toContain("etape 2 sur 4");
  await tabTo(nvda, "Ajouter une population", info);
  const population = await activateCurrent(
    nvda,
    info,
    "wizard-real-add-population",
  );
  await expect(page.getByTestId("application-population-0")).toBeFocused();
  expect(population.text).toContain("population cible 1");
  await nvda.type("Population fictive", { capture: false });
  await tabTo(nvda, "Supprimer le champ de la population numéro 1", info);
  const removed = await activateCurrent(
    nvda,
    info,
    "wizard-real-remove-population",
  );
  await expect(page.getByTestId("application-population-add")).toBeFocused();
  expect(removed.text).toContain("ajouter une population");
  await tabTo(nvda, "Ajouter un objectif", info);
  const purpose = await activateCurrent(nvda, info, "wizard-real-add-purpose");
  expect(purpose.text).toContain("objectif 1");
  await nvda.type("Objectif fictif conservé", { capture: false });
  await tabTo(nvda, "Suivant", info);
  const moa = await activateCurrent(nvda, info, "wizard-real-moa-step");
  expect(moa.text).toContain("etape 3 sur 4");
  await tabTo(nvda, "Suivant", info);
  const invalidContact = await activateCurrent(
    nvda,
    info,
    "wizard-empty-moa-contact",
  );
  expect(invalidContact.text).toContain("email du contact moa");
  expect(invalidContact.text).toContain("obligatoire");
  await expect(page.getByTestId("application-moa-email")).toBeFocused();
  await nvda.type("moa@example.invalid", { capture: false });
  const org = page.getByTestId("application-moa-organization");
  await reachControl(nvda, org.getByRole("textbox"), "Organisation MOA", info);
  await nvda.type("org", { capture: false });
  await expect(org.getByRole("combobox")).toBeEnabled();
  await reachControl(
    nvda,
    org.getByRole("combobox"),
    "Choisir une organisation",
    info,
  );
  await nvda.press("End", { capture: false });
  await expect(org.getByRole("combobox")).toHaveValue("org-synthetic-001");
  await reachControl(
    nvda,
    page.getByTestId("application-moa-firstname"),
    "Prénom du contact MOA",
    info,
  );
  await reachControl(
    nvda,
    page.getByTestId("application-moa-lastname"),
    "Nom du contact MOA",
    info,
  );
  const group = page.getByRole("checkbox", { name: /Cet acteur est rattaché/ });
  await reachControl(nvda, group, "Cet acteur est rattaché", info);
  const grouped = await captureStep(
    nvda,
    "wizard-moa-group-state-native",
    () => nvda.press("Space", { capture: true }),
    info,
  );
  expect(grouped.text).toMatch(/\bcochee?\b|\bactive\b/);
  expect(grouped.text).not.toMatch(/\bnon (?:coche|active)|\bdecoche/);
  await expect(page.getByTestId("application-moa-firstname")).toHaveCount(0);
  await tabTo(nvda, "Suivant", info);
  const moe = await activateCurrent(nvda, info, "wizard-real-moe-step");
  expect(moe.text).toContain("etape 4 sur 4");
  await reachControl(
    nvda,
    page.getByTestId("application-moe-email"),
    "Email du contact MOE",
    info,
  );
  await nvda.type("moe@example.invalid", { capture: false });
  await reachControl(
    nvda,
    page.getByTestId("application-moe-firstname"),
    "Prénom du contact MOE",
    info,
  );
  await reachControl(
    nvda,
    page.getByTestId("application-moe-lastname"),
    "Nom du contact MOE",
    info,
  );
  await tabTo(nvda, "Annuler", info);
  const cancelled = await activateCurrent(
    nvda,
    info,
    "wizard-real-cancel-dialog",
  );
  expect(cancelled.text).toContain("annuler la creation de l application");
  await tabTo(nvda, "Reprendre", info);
  const resumed = await activateCurrent(nvda, info, "wizard-real-resume");
  expect(resumed.text).toContain("annuler");
  await expect(page.getByTestId("application-cancel-btn")).toBeFocused();
  await expect(page.getByTestId("application-moe-email")).toHaveValue(
    "moe@example.invalid",
  );
  for (let step = 3; step >= 1; step--) {
    await tabTo(nvda, "Précédent", info);
    const previous = await activateCurrent(
      nvda,
      info,
      `wizard-real-previous-${step}`,
    );
    expect(previous.text).toContain(`etape ${step} sur 4`);
    await expect(
      page.getByTestId(`application-step-title-${step}`),
    ).toBeFocused();
  }
  await expect(page.getByTestId("application-label")).toHaveValue(
    "Application fictive Alpha",
  );
  await expect(page.getByTestId("markdown-textarea")).toHaveValue(
    "Description fictive conservée",
  );
  expect(
    network.remainingCalls.filter((call) => call.method !== "GET"),
  ).toHaveLength(0);
  expect(network.calls.filter((call) => call.method !== "GET")).toHaveLength(0);
  await finishRemaining(page, network, info);
});
