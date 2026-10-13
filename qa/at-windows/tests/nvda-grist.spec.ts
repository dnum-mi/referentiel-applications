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
import { setupGrist, finishGrist } from "./grist-interactive-utils.js";
test.use({ serviceWorkers: "block" });
test.beforeEach(async ({}, info) => {
  info.setTimeout(720_000);
  info.annotations.push({
    type: "RGAA",
    description:
      "7.1.2 — U24 Grist, vrais composants et réponses locales fictives ; aucune écriture Grist réelle",
  });
});
async function draft(nvda: NVDAPlaywright, value: string, info: TestInfo) {
  await captureStep(
    nvda,
    "grist-replace-draft",
    async () => {
      await nvda.press("Control+a", { capture: true });
      await nvda.type(value, { capture: true });
    },
    info,
  );
}
async function focus(
  nvda: NVDAPlaywright,
  target: Locator,
  name: string,
  info: TestInfo,
) {
  const direction = await target.evaluate((e) =>
    document.activeElement &&
    document.activeElement !== document.body &&
    document.activeElement.compareDocumentPosition(e) &
      Node.DOCUMENT_POSITION_PRECEDING
      ? "Shift+Tab"
      : "Tab",
  );
  const spoken = await tabTo(nvda, name, info, 65, direction);
  await expect(target).toBeFocused();
  expect(spoken.text).toContain(normalizeSpeech(name));
  return spoken;
}
async function current(nvda: NVDAPlaywright, info: TestInfo, step: string) {
  return captureStep(
    nvda,
    step,
    () =>
      nvda.perform(nvda.keyboardCommands.reportCurrentFocus, { capture: true }),
    info,
  );
}
test("AT-U24-Settings — erreurs de saisie, limite de 20 documents, refus réseau et retours de focus", async ({
  page,
  browser,
  nvda,
}, info) => {
  const n = await setupGrist(page, "settings");
  await attachIdentity(nvda, browser.version(), info);
  await focusDocumentStart(page, nvda);
  const input = (id: string) =>
    page.locator(`input[data-testid="${id}"], [data-testid="${id}"] input`);
  const url = input("user-grist-url-input"),
    key = input("user-grist-api-key-input"),
    doc = input("user-grist-document-input");
  const save = page.getByTestId("user-grist-connection-save"),
    add = page.getByTestId("user-grist-document-add");
  await focus(nvda, url, "Adresse de l’instance Grist", info);
  await draft(nvda, "http://invalid.example", info);
  await focus(nvda, save, "Enregistrer", info);
  await activateCurrent(nvda, info, "invalid-grist-url");
  await expect(url).toBeFocused();
  expect((await current(nvda, info, "invalid-url-description")).text).toContain(
    "saisissez l adresse https",
  );
  await draft(nvda, "https://grist.example.invalid", info);
  await focus(nvda, save, "Enregistrer", info);
  await activateCurrent(nvda, info, "missing-grist-key");
  await expect(key).toBeFocused();
  expect((await current(nvda, info, "missing-key-description")).text).toContain(
    "saisissez votre cle d api",
  );
  await draft(nvda, "fictive-key-never-sent", info);
  await focus(nvda, save, "Enregistrer", info);
  const denied = await captureStep(
    nvda,
    "grist-preferences500",
    async () => {
      await nvda.press("Enter", { capture: true });
      await nvda.capture(
        async () => {
          await expect(page.getByTestId("app-toaster")).toContainText(
            "Erreur lors de la mise à jour de votre configuration Grist",
          );
        },
        { capture: true },
      );
    },
    info,
  );
  expect(denied.text).toContain(
    "erreur lors de la mise a jour de votre configuration grist",
  );
  await expect(save).toBeFocused();
  await expect(key).toHaveValue("fictive-key-never-sent");
  n.state.preferences = "success";
  await activateCurrent(nvda, info, "grist-preferences-retry");
  await expect(key).toHaveValue("");
  await expect(save).toBeFocused();
  await focus(nvda, doc, "Identifiant du document", info);
  for (const [value, error] of [
    ["bad", "6 a 64"],
    ["doc000", "deja dans la liste"],
    ["unique001", "plus de 20 documents"],
  ]) {
    await draft(nvda, value, info);
    await focus(nvda, add, "Ajouter", info);
    await activateCurrent(nvda, info, `grist-document-validation-${value}`);
    await expect(doc).toBeFocused();
    expect(
      (await current(nvda, info, `grist-document-error-${value}`)).text,
    ).toContain(error);
  }
  await focus(
    nvda,
    page.getByRole("button", {
      name: "Retirer le document doc000",
      exact: true,
    }),
    "Retirer le document doc000",
    info,
  );
  const removed = await activateCurrent(nvda, info, "grist-remove-document");
  await expect(page.getByTestId("user-grist-document")).toHaveCount(19);
  await expect(doc).toBeFocused();
  expect(removed.text).toContain("retire");
  await draft(nvda, "unique001", info);
  await focus(nvda, add, "Ajouter", info);
  await activateCurrent(nvda, info, "grist-add-document");
  await expect(page.getByTestId("user-grist-document")).toHaveCount(20);
  await expect(add).toBeFocused();
  await expect(doc).toHaveValue("");
  await focus(
    nvda,
    page.getByTestId("user-grist-api-key-remove"),
    "Supprimer la clé",
    info,
  );
  await activateCurrent(nvda, info, "grist-remove-key");
  await expect(key).toBeFocused();
  await expect(page.getByTestId("user-grist-api-key-remove")).toHaveCount(0);
  await finishGrist(page, n, info);
});
test("AT-U24-Sync — vrais choix de tables, document illisible, refus annoncé et réessai", async ({
  page,
  browser,
  nvda,
}, info) => {
  const n = await setupGrist(page, "sync");
  await attachIdentity(nvda, browser.version(), info);
  await focusDocumentStart(page, nvda);
  const opener = page.getByTestId("grist-sync-btn");
  await focus(nvda, opener, "Synchroniser avec Grist", info);
  await activateCurrent(nvda, info, "grist-sync-open");
  const d = page.getByRole("dialog", {
    name: "Synchroniser avec Grist",
    exact: true,
  });
  await expect(d).toBeVisible();
  const first = d.getByRole("combobox", {
    name: "Document doc001",
    exact: true,
  });
  await focus(nvda, first, "Document doc001", info);
  await captureStep(
    nvda,
    "grist-new-table",
    () => nvda.press("End", { capture: true }),
    info,
  );
  await expect(first).toHaveValue("__new__");
  expect((await current(nvda, info, "grist-selected-table")).text).toContain(
    "nouvelle table",
  );
  await expect(
    d.getByRole("combobox", { name: "Document doc003", exact: true }),
  ).toBeDisabled();
  const submit = d.getByTestId("grist-sync-confirm-btn");
  await focus(nvda, submit, "Synchroniser", info);
  const denied = await captureStep(
    nvda,
    "grist-sync500",
    async () => {
      await nvda.press("Enter", { capture: true });
      await nvda.capture(
        async () => {
          await expect(d.getByTestId("grist-sync-error")).toContainText(
            "Une erreur est survenue lors de la synchronisation avec Grist",
          );
        },
        { capture: true },
      );
    },
    info,
  );
  expect(denied.text).toContain(
    "une erreur est survenue lors de la synchronisation avec grist",
  );
  await expect(submit).toBeFocused();
  await expect(first).toHaveValue("__new__");
  n.state.sync = "success";
  const success = await activateCurrent(nvda, info, "grist-sync-retry");
  await expect(d).not.toBeVisible();
  await expect(opener).toBeFocused();
  expect(success.text).toContain("grist synchronise");
  expect(
    n.gristCalls.filter((c) => c.path === "/api/v2/grist/setup").at(-1)?.body,
  ).toEqual({
    targets: [
      { docId: "doc001", newTable: true },
      { docId: "doc002", newTable: true },
    ],
  });
  n.state.tables = "error";
  const failure = await activateCurrent(nvda, info, "grist-read-error-open");
  await expect(d.getByTestId("grist-sync-error")).toContainText(
    "Impossible de lire vos documents Grist",
  );
  expect(failure.text).toContain("impossible de lire vos documents grist");
  await tabTo(nvda, "Annuler", info);
  await activateCurrent(nvda, info, "grist-cancel-after-read-error");
  await expect(d).not.toBeVisible();
  await expect(opener).toBeFocused();
  await finishGrist(page, n, info);
});
