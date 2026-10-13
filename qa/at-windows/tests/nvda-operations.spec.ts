import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  expect,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";
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
  finishOperations,
  operationsNetwork,
} from "./operations-interactive-utils.js";

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

// DOM reads disambiguate repeated controls; native Tab alone moves focus.
// A date's accessible label can be spoken on arrival instead of by the report
// of its month segment. Only the arrival on this target is combined with that report.
async function reachControl(
  nvda: NVDAPlaywright,
  target: Locator,
  name: string,
  info: TestInfo,
  direction: "Tab" | "Shift+Tab" = "Tab",
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
      if (!arrival) {
        // A preceding table read may leave the browse cursor away from DOM
        // focus. Rejoin this native tab stop without activating another control.
        arrival = await captureStep(
          nvda,
          "operations-join-current-tab-stop",
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
      const focus = await currentFocus(
        nvda,
        info,
        `operations-current-${index}`,
      );
      const phrases = [...arrival.phrases, ...focus.phrases];
      const observed = { phrases, text: normalizeSpeech(phrases.join(" ")) };
      expect(observed.text).toContain(normalizeSpeech(name));
      return observed;
    }
    arrival = await captureStep(
      nvda,
      `operations-native-${direction === "Tab" ? "tab" : "shift-tab"}-${index}`,
      () => nvda.press(direction, { capture: true }),
      info,
    );
    visited.push(arrival.text);
  }
  throw new Error(
    `Commande non atteinte par Tab natif : ${name}. Annonces : ${JSON.stringify(visited)}`,
  );
}

async function selectAdminTab(
  page: Page,
  nvda: NVDAPlaywright,
  name: string,
  info: TestInfo,
) {
  const selected = page
    .getByRole("tablist", { name: "Administration", exact: true })
    .locator('[role="tab"][aria-selected="true"]');
  // After a log or a user-history dialogue, the tab bar precedes the current
  // control. Read the order only; the actual movement remains native Tab.
  const direction = await selected.evaluate((element) =>
    element.compareDocumentPosition(document.activeElement!) &
    Node.DOCUMENT_POSITION_FOLLOWING
      ? ("Shift+Tab" as const)
      : ("Tab" as const),
  );
  await reachControl(
    nvda,
    selected,
    (await selected.innerText()).trim(),
    info,
    direction,
  );
  const target = page.getByRole("tab", { name, exact: true });
  for (let index = 0; index < 12; index++) {
    if ((await target.getAttribute("aria-selected")) === "true") {
      await expect(target).toBeFocused();
      const spoken = await currentFocus(
        nvda,
        info,
        `operations-selected-tab-${name}`,
      );
      expect(spoken.text).toContain(normalizeSpeech(name));
      expect(spoken.text).toMatch(/onglet|selectionn/);
      return spoken;
    }
    await captureStep(
      nvda,
      `operations-admin-tab-arrow-${index}`,
      () => nvda.press("ArrowRight", { capture: true }),
      info,
    );
  }
  throw new Error(`Onglet non atteint par flèches natives : ${name}`);
}

async function managementTheme(
  page: Page,
  nvda: NVDAPlaywright,
  info: TestInfo,
) {
  await reachControl(
    nvda,
    page.getByTestId("admin-theme-tile-management"),
    "Gestion",
    info,
  );
  await activateCurrent(nvda, info, "operations-management-theme");
  await expect(page.getByTestId("admin-theme-tile-management")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
}

async function browseTable(nvda: NVDAPlaywright, info: TestInfo, step: string) {
  let browse = false;
  for (let index = 0; index < 2; index++) {
    const mode = await captureStep(
      nvda,
      `${step}-browse-mode-${index}`,
      () =>
        nvda.perform(nvda.keyboardCommands.toggleBetweenBrowseAndFocusMode, {
          capture: true,
        }),
      info,
    );
    if (mode.text.includes("mode navigation")) {
      browse = true;
      break;
    }
  }
  if (!browse) throw new Error("Mode navigation non annoncé avant le tableau.");
  return captureStep(
    nvda,
    step,
    async () => {
      await nvda.perform(nvda.keyboardCommands.moveToNextTable, {
        capture: true,
      });
      await nvda.perform(nvda.keyboardCommands.moveToNextColumn, {
        capture: true,
      });
      await nvda.perform(nvda.keyboardCommands.moveToNextRow, {
        capture: true,
      });
    },
    info,
  );
}

test.use({ serviceWorkers: "block" });
test.beforeEach(async ({}, info) => {
  info.setTimeout(900_000);
  info.annotations.push({
    type: "RGAA",
    description:
      "7.1.2 — U12/U15/U17 : vrai App, vrais composants, session fictive locale et API strictement simulées ; aucun verdict pour les variantes non parcourues",
  });
});

test("AT-OPS-U12 — suppression application, annulation, saisie et DELETE500 puis204 simulés", async ({
  page,
  browser,
  nvda,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const network = await operationsNetwork(page);
  await page.goto(`${network.base}/applications/${alpha}/tab-reports`);
  await expect(page.getByTestId("application-title")).toHaveText(
    "Application fictive Alpha",
  );
  await attachIdentity(nvda, browser.version(), info);
  await focusDocumentStart(page, nvda);
  const opener = page.getByTestId("application-delete-btn");
  await reachControl(nvda, opener, "Supprimer l'application", info);
  const dialog = page.getByRole("dialog", {
    name: "Supprimer définitivement l’application",
    exact: true,
  });
  const opened = await activateCurrent(nvda, info, "application-delete-open");
  await expect(dialog).toBeVisible();
  expect(opened.text).toContain("supprimer definitivement");
  expect(opened.text).toMatch(/dialogue|dialog/);
  const name = dialog.getByTestId("application-delete-input");
  const nameSpeech = await reachControl(
    nvda,
    name,
    "Nom de l'application",
    info,
  );
  expect(nameSpeech.text).toMatch(/edition|texte/);
  await captureStep(
    nvda,
    "application-delete-invalid-name",
    () => nvda.type("Nom inexact", { capture: true }),
    info,
  );
  const confirm = dialog.getByRole("button", {
    name: "Supprimer définitivement",
    exact: true,
  });
  await expect(confirm).toBeDisabled();
  await reachControl(
    nvda,
    dialog.getByRole("button", { name: "Annuler", exact: true }),
    "Annuler",
    info,
  );
  await activateCurrent(nvda, info, "application-delete-cancel");
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
  expect(
    network.operationsCalls.filter((call) => call.method === "DELETE"),
  ).toHaveLength(0);
  expect(
    (await currentFocus(nvda, info, "application-delete-cancel-return")).text,
  ).toContain("supprimer");
  await activateCurrent(nvda, info, "application-delete-reopen");
  await reachControl(nvda, name, "Nom de l'application", info);
  await captureStep(
    nvda,
    "application-delete-valid-name",
    () => nvda.type("Application fictive Alpha", { capture: true }),
    info,
  );
  await reachControl(nvda, confirm, "Supprimer définitivement", info);
  const failed = await captureStep(
    nvda,
    "application-delete500-local-error",
    async () => {
      await nvda.press("Enter", { capture: true });
      await expect(
        dialog.getByTestId("application-delete-error"),
      ).toContainText("Erreur lors de la suppression définitive");
    },
    info,
  );
  expect(failed.text).toContain("erreur lors de la suppression definitive");
  await expect(dialog).toBeVisible();
  await expect(name).toHaveValue("Application fictive Alpha");
  await expect(confirm).toBeFocused();
  expect(
    network.operationsCalls.filter((call) => call.method === "DELETE"),
  ).toHaveLength(1);
  network.operationsState.deletion = "success";
  const success = await activateCurrent(
    nvda,
    info,
    "application-delete-retry204",
  );
  await expect(page).toHaveURL(/recherche-application/);
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Application supprimée définitivement avec succès" }),
  ).toBeVisible();
  expect(success.text).toContain(
    "application supprimee definitivement avec succes",
  );
  expect(
    network.operationsCalls.filter((call) => call.method === "DELETE"),
  ).toHaveLength(2);
  expect(errors).toEqual([]);
  await finishOperations(page, network, info);
});

test("AT-OPS-U15 — import batch, attente, erreur, rapport et MAIA refusé, tout simulé", async ({
  page,
  browser,
  nvda,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const network = await operationsNetwork(page);
  await page.goto(`${network.base}/administration`);
  await expect(page.getByTestId("admin-users-title")).toBeVisible();
  await attachIdentity(nvda, browser.version(), info);
  await focusDocumentStart(page, nvda);
  await managementTheme(page, nvda, info);
  await selectAdminTab(page, nvda, "Batch de données", info);
  const file = page.getByTestId("admin-import-file"),
    submit = page.getByTestId("admin-import-submit");
  await expect(submit).toBeDisabled();
  const fileSpeech = await reachControl(nvda, file, "Fichier Excel", info);
  expect(fileSpeech.text).toMatch(/bouton|parcourir|fichier/);
  // Inject a synthetic local file into the real input/change handler. This
  // does not qualify the Windows file chooser; all later commands are native.
  const filePath = fileURLToPath(
    new URL("../fixtures/at-import-synthetic.xlsx", import.meta.url),
  );
  await file.setInputFiles(filePath);
  network.operationsState.mutationDelayMs = 7000;
  await reachControl(nvda, submit, "Importer le fichier", info);
  const waiting = await activateCurrent(
    nvda,
    info,
    "batch-import-start-and-progress",
  );
  await expect(submit).toHaveAttribute("aria-disabled", "true");
  expect(
    await submit.evaluate((element: HTMLButtonElement) => element.disabled),
  ).toBe(false);
  await expect(submit).toBeFocused();
  await expect(page.getByTestId("admin-batch-progress")).toContainText(
    "Import du fichier Excel en cours",
  );
  expect(waiting.text).toContain("import du fichier excel en cours");
  const failed = await captureStep(
    nvda,
    "batch-import-concurrent-enter-and500",
    async () => {
      await nvda.press("Enter", { capture: true });
      await expect(
        page
          .getByRole("alert")
          .filter({ hasText: "Erreur lors de l'import du fichier Excel" }),
      ).toBeVisible();
    },
    info,
  );
  expect(failed.text).toContain(
    normalizeSpeech("Erreur lors de l'import du fichier Excel"),
  );
  await expect(submit).toBeFocused();
  expect(
    network.operationsCalls.filter(
      (call) => call.pathname === "/api/v2/import/excel",
    ),
  ).toHaveLength(1);
  expect(
    await file.evaluate((input: HTMLInputElement) =>
      Array.from(input.files ?? [], (selected) => selected.name),
    ),
  ).toEqual(["at-import-synthetic.xlsx"]);
  network.operationsState.import = "success";
  network.operationsState.mutationDelayMs = 900;
  const result = await activateCurrent(
    nvda,
    info,
    "batch-import-retry-mixed-report",
  );
  await expect(page.getByTestId("admin-import-report-summary")).toContainText(
    "1 créé(s), 1 mis à jour, 1 en erreur",
  );
  expect(result.text).toContain("import termine avec des erreurs");
  await expect(page.getByTestId("admin-import-processed-sheets")).toContainText(
    "Applications",
  );
  await expect(page.getByTestId("admin-import-ignored-sheets")).toContainText(
    "Ancien onglet",
  );
  const report = await browseTable(nvda, info, "batch-native-report-table");
  expect(report.text).toMatch(/tableau|table/);
  expect(report.text).toMatch(/onglet|ligne|statut|identifiant/);
  const download = page.waitForEvent("download");
  await reachControl(
    nvda,
    page.getByTestId("admin-import-report-download-html"),
    "Télécharger le rapport HTML",
    info,
  );
  await activateCurrent(nvda, info, "batch-download-local-html-report");
  const downloaded = await download;
  expect(downloaded.suggestedFilename()).toMatch(/\.html$/);
  const downloadedPath = await downloaded.path();
  expect(downloadedPath).not.toBeNull();
  const html = await readFile(downloadedPath!, "utf8");
  expect(html).toContain("Erreur de ligne entièrement simulée");
  await info.attach("operations-local-generated-import-report", {
    body: Buffer.from(html),
    contentType: "text/html",
  });
  await reachControl(
    nvda,
    page.getByTestId("admin-users-maia-batch-btn").nth(0),
    "utilisateurs sans organisation",
    info,
    "Shift+Tab",
  );
  const maia = await activateCurrent(
    nvda,
    info,
    "batch-maia500-no-false-success",
  );
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Erreur lors du lancement du batch MAIA" }),
  ).toBeVisible();
  expect(maia.text).toContain("erreur lors du lancement du batch maia");
  await expect(
    page.getByTestId("admin-users-maia-batch-btn").nth(0),
  ).toBeFocused();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Batch MAIA lancé en tâche de fond" }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
  await finishOperations(page, network, info);
});

test("AT-OPS-U17 — historiques réels, filtres, journaux, e-mail et dialogues de consultation", async ({
  page,
  browser,
  nvda,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const network = await operationsNetwork(page);
  await page.goto(`${network.base}/historique`);
  await expect(page.getByTestId("history-table")).toBeVisible();
  await attachIdentity(nvda, browser.version(), info);
  await focusDocumentStart(page, nvda);
  await reachControl(
    nvda,
    page.getByTestId("history-see-more-button"),
    "Voir plus",
    info,
  );
  await activateCurrent(nvda, info, "metadata-real-detail-link");
  await expect(page.getByTestId("metadata-description")).toContainText(
    "Modification fictive",
  );
  await focusDocumentStart(page, nvda);
  await reachControl(
    nvda,
    page.getByTestId("back-button"),
    "Retour à l'historique",
    info,
  );
  await activateCurrent(nvda, info, "metadata-back-to-history");
  await expect(page.getByTestId("history-table")).toBeVisible();
  await focusDocumentStart(page, nvda);
  const from = page.locator(
    'input[data-testid="history-filter-date-from"], [data-testid="history-filter-date-from"] input',
  );
  await reachControl(nvda, from, "Date de début", info);
  // A prepared date avoids relying on Windows segment order for fixture input;
  // the date label, native arrival and filter command are still checked by NVDA.
  await from.fill("2026-10-01T12:00");
  network.operationsState.metadata = "error";
  await reachControl(
    nvda,
    page.locator(
      'input[data-testid="history-filter-date-to"], [data-testid="history-filter-date-to"] input',
    ),
    "Date de fin",
    info,
  );
  await reachControl(
    nvda,
    page.getByTestId("history-apply-filters"),
    "Appliquer les filtres",
    info,
  );
  const metadataError = await activateCurrent(
    nvda,
    info,
    "metadata-filter500-conserve-focus",
  );
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "récupération des metadatas globales" }),
  ).toBeVisible();
  expect(metadataError.text).toContain("recuperation des metadatas globales");
  await expect(from).toHaveValue("2026-10-01T12:00");
  await expect(page.getByTestId("history-apply-filters")).toBeFocused();

  await page.goto(`${network.base}/administration`);
  await expect(page.getByTestId("admin-users-title")).toBeVisible();
  await focusDocumentStart(page, nvda);
  await managementTheme(page, nvda, info);
  network.operationsState.actionLogs = "error";
  await selectAdminTab(page, nvda, "Journal des actions", info);
  await expect(page.getByTestId("admin-action-logs-error")).toContainText(
    "Erreur lors du chargement du journal",
  );
  // Re-enter this loaded tab once to capture its own error update, rather than
  // combining unrelated utterances from the preceding tab navigation.
  await selectAdminTab(page, nvda, "Historique des e-mails", info);
  const actionError = await captureStep(
    nvda,
    "action-logs500-assertive",
    async () => {
      await nvda.press("ArrowRight", { capture: true });
      await expect(page.getByTestId("admin-action-logs-error")).toContainText(
        "Erreur lors du chargement du journal",
      );
    },
    info,
  );
  expect(actionError.text).toContain(
    "erreur lors du chargement du journal des actions",
  );
  network.operationsState.actionLogs = "empty";
  const search = page.locator(
    'input[data-testid="admin-action-logs-search"], [data-testid="admin-action-logs-search"] input',
  );
  await reachControl(nvda, search, "Rechercher", info);
  const empty = await captureStep(
    nvda,
    "action-logs-search-empty-status",
    async () => {
      await nvda.type("sans resultat", { capture: true });
      await expect(page.getByTestId("admin-action-logs-status")).toHaveText(
        "Aucune action journalisée.",
      );
    },
    info,
  );
  expect(empty.text).toContain("aucune action journalisee");
  await expect(search).toBeFocused();
  network.operationsState.emailLogs = "error";
  const emailTab = page.getByRole("tab", {
    name: "Historique des e-mails",
    exact: true,
  });
  await reachControl(
    nvda,
    page.getByRole("tab", { name: "Journal des actions", exact: true }),
    "Journal des actions",
    info,
    "Shift+Tab",
  );
  const emailError = await captureStep(
    nvda,
    "email-logs500-assertive",
    async () => {
      await nvda.press("ArrowLeft", { capture: true });
      await expect(page.getByTestId("admin-email-logs-error")).toContainText(
        "Erreur lors du chargement de l'historique",
      );
    },
    info,
  );
  await expect(emailTab).toBeFocused();
  expect(emailError.text).toContain(
    normalizeSpeech("Erreur lors du chargement de l'historique des e-mails"),
  );
  network.operationsState.emailLogs = "results";
  await selectAdminTab(page, nvda, "Journal des actions", info);
  await selectAdminTab(page, nvda, "Historique des e-mails", info);
  await expect(page.getByTestId("admin-email-logs-table")).toBeVisible();
  const emailOpener = page.getByTestId("admin-email-log-view-btn");
  await reachControl(
    nvda,
    emailOpener,
    "Voir le contenu complet de l'e-mail",
    info,
  );
  const emailOpening = await activateCurrent(
    nvda,
    info,
    "email-log-real-dialog-open",
  );
  const emailDialog = page.getByRole("dialog", {
    name: "Message entièrement fictif",
    exact: true,
  });
  await expect(emailDialog).toBeVisible();
  expect(emailOpening.text).toContain("message entierement fictif");
  await expect(emailDialog.locator("iframe")).toHaveAttribute(
    "title",
    "Contenu de l'e-mail",
  );
  // Read the real sanitized iframe through NVDA, without replacing its content
  // or injecting a speech fixture. The Windows runner must supply this speech.
  const emailContent = await captureStep(
    nvda,
    "email-log-native-iframe-content",
    () => nvda.perform(nvda.keyboardCommands.sayAll, { capture: true }),
    info,
  );
  expect(emailContent.text).toContain("contenu local sans lien externe");
  await reachControl(
    nvda,
    emailDialog.getByRole("button", { name: "Fermer", exact: true }),
    "Fermer",
    info,
  );
  await activateCurrent(nvda, info, "email-log-close-return");
  await expect(emailOpener).toBeFocused();

  await page.goto(`${network.base}/administration`);
  await expect(page.getByTestId("admin-users-title")).toBeVisible();
  await focusDocumentStart(page, nvda);
  network.operationsState.userHistory = "error";
  for (const [openerId, openerName, title, errorId] of [
    [
      "admin-user-permissions-btn",
      "Permissions",
      "Permissions de l'utilisateur — historique@example.invalid",
      "permission-log-history-error",
    ],
    [
      "admin-user-connexions-btn",
      "Voir l'historique des connexions",
      "Historique des connexions — historique@example.invalid",
      "connexion-log-history-error",
    ],
  ] as const) {
    const opener = page.getByTestId(openerId);
    await reachControl(nvda, opener, openerName, info);
    const opening = await activateCurrent(
      nvda,
      info,
      `user-history-open-${openerId}`,
    );
    const dialog = page.getByRole("dialog", { name: title, exact: true });
    await expect(dialog.getByTestId(errorId)).toContainText(
      "Erreur lors du chargement",
    );
    expect(opening.text).toContain("erreur lors du chargement");
    expect(opening.text).toMatch(/dialogue|dialog/);
    await reachControl(
      nvda,
      dialog.getByRole("button", { name: "Fermer", exact: true }),
      "Fermer",
      info,
    );
    await activateCurrent(nvda, info, `user-history-close-${openerId}`);
    await expect(opener).toBeFocused();
  }
  await selectAdminTab(page, nvda, "Matrice des permissions", info);
  const matrixOpener = page.getByTestId("app-perms-history-btn");
  await reachControl(nvda, matrixOpener, "Historique", info);
  const matrixOpening = await activateCurrent(
    nvda,
    info,
    "permissions-matrix-history-open",
  );
  const matrix = page.getByRole("dialog", {
    name: "Historique des modifications de la matrice des permissions",
    exact: true,
  });
  await expect(
    matrix.getByTestId("app-perms-matrix-history-table"),
  ).toBeVisible();
  expect(matrixOpening.text).toContain("historique des modifications");
  const matrixTable = await browseTable(
    nvda,
    info,
    "permissions-matrix-native-history-table",
  );
  expect(matrixTable.text).toMatch(/tableau|table/);
  await reachControl(
    nvda,
    matrix.getByRole("button", { name: "Fermer", exact: true }),
    "Fermer",
    info,
  );
  await activateCurrent(nvda, info, "permissions-matrix-close-return");
  await expect(matrixOpener).toBeFocused();
  expect(errors).toEqual([]);
  await finishOperations(page, network, info);
});
