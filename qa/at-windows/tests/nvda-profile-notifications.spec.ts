import { execFile } from "node:child_process";
import { promisify } from "node:util";
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
import { activateCurrent, passKeyToApplication } from "./native-utils.js";
import {
  profileNotificationsNetwork,
  mountG5Scene,
  finishG5,
} from "./profile-notifications-utils.js";

import { reachG5, releaseG5 } from "./profile-notifications-native.js";

const execFileAsync = promisify(execFile);
const fakeToken = "SYNTHETIC_G5_TOKEN_NOT_A_CREDENTIAL";
test.use({ serviceWorkers: "block" });
test.beforeEach(async ({}, info) => {
  info.setTimeout(600_000);
  info.annotations.push({
    type: "RGAA",
    description:
      "7.1.2 — G5 : vrais tokens personnels, préférences, désabonnements et notifications ; API intégralement fictive, seule la parole NVDA native qualifie la restitution",
  });
});

async function enterNative(
  nvda: NVDAPlaywright,
  target: Locator,
  name: string | RegExp,
  value: string,
  info: TestInfo,
) {
  if (!/^[\x20-\x7e]+$/.test(value))
    throw new Error("Only fictional ASCII input is allowed in Guidepup type.");
  await reachG5(nvda, target, name, info);
  await captureStep(
    nvda,
    "g5-select-input",
    () => nvda.press("Control+a", { capture: true }),
    info,
  );
  await captureStep(
    nvda,
    "g5-type-input",
    () => nvda.type(value, { capture: true }),
    info,
  );
  await expect(target).toHaveValue(value);
}

async function chooseProfileTab(
  page: Page,
  nvda: NVDAPlaywright,
  index: 0 | 1 | 2,
  info: TestInfo,
) {
  const names = ["Mes informations", "Mes tokens", "Mes abonnements"];
  await reachG5(
    nvda,
    page.getByRole("tab", { name: names[0], exact: true }),
    names[0],
    info,
  );
  for (let turn = 0; turn < index; turn++) {
    const moved = await captureStep(
      nvda,
      "g5-profile-native-next-tab",
      () => nvda.press("ArrowRight", { capture: true }),
      info,
    );
    expect(moved.text).toContain(normalizeSpeech(names[turn + 1]));
  }
  await expect(
    page.getByRole("tab", { name: names[index], exact: true }),
  ).toHaveAttribute("aria-selected", "true");
}

async function startScene(
  page: Page,
  nvda: NVDAPlaywright,
  baseUrl: string,
  browserVersion: string,
  scene: "profile" | "notifications" | "bell",
  info: TestInfo,
) {
  await page.goto(baseUrl);
  await mountG5Scene(page, scene);
  await attachIdentity(nvda, browserVersion, info);
  await focusDocumentStart(page, nvda);
}

async function submitNative(
  page: Page,
  nvda: NVDAPlaywright,
  target: Locator,
  name: string | RegExp,
  info: TestInfo,
  step: string,
) {
  await reachG5(nvda, target, name, info);
  await activateCurrent(nvda, info, step);
  await expect(target).toHaveAttribute("aria-disabled", "true");
  // NVDA can move its browse cursor when this pending button changes name.
  // The duplicate activation targets the actual focused button through NVDA's
  // pass-next-key command; the unchanged network assertion checks the guard.
  await expect(target).toBeFocused();
  await captureStep(
    nvda,
    `${step}-duplicate`,
    () => passKeyToApplication(nvda, "Enter"),
    info,
  );
  await expect(target).toBeFocused();
}

test("AT-G5-TOKENS — création refusée puis réussie, copie réelle et révocation", async ({
  page,
  browser,
  nvda,
}, info) => {
  const network = await profileNotificationsNetwork(page);
  try {
    await startScene(
      page,
      nvda,
      network.base,
      browser.version(),
      "profile",
      info,
    );
    await chooseProfileTab(page, nvda, 1, info);
    const opener = page.getByTestId("token-create-btn");
    await reachG5(nvda, opener, "Créer un nouveau token", info);
    await activateCurrent(nvda, info, "personal-token-open");
    await expect(page.locator("#token-name")).toBeFocused();
    await enterNative(
      nvda,
      page.locator("#token-name"),
      /\bnom\b.*edition|edition.*\bnom\b/,
      "Service G5",
      info,
    );
    await enterNative(
      nvda,
      page.locator("#token-description"),
      "Description",
      "Description G5",
      info,
    );
    // Same synthetic prerequisite as the existing service-token scenario:
    // no claim about the browser's native date picker is made here.
    await page.locator("#token-expiresAt").evaluate((element) => {
      const input = element as HTMLInputElement;
      input.value = "2027-01-01";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await info.attach("personal-token-expiration-setup", {
      body: JSON.stringify({
        date: "2027-01-01",
        method: "synthetic input event, no focus change",
        nativeCalendarTested: false,
      }),
      contentType: "application/json",
    });
    const submit = page.getByRole("button", {
      name: "Créer le token",
      exact: true,
    });
    await submitNative(
      page,
      nvda,
      submit,
      "Créer le token",
      info,
      "personal-token-create-failure",
    );
    const refusal = await releaseG5(
      page,
      nvda,
      network,
      "error",
      async () => {
        await expect(
          page
            .getByRole("alert")
            .filter({ hasText: "Erreur lors de la création du token" }),
        ).toBeVisible();
      },
      "personal-token-create-error-native",
      info,
    );
    expect(refusal.text).toContain(
      normalizeSpeech("Erreur lors de la création du token"),
    );
    await expect(page.locator("#token-name")).toHaveValue("Service G5");
    await expect(page.locator("#token-description")).toHaveValue(
      "Description G5",
    );
    expect(
      network.g5Calls.filter((call) => call.method === "POST"),
    ).toHaveLength(1);
    await submitNative(
      page,
      nvda,
      submit,
      "Créer le token",
      info,
      "personal-token-create-retry",
    );
    const created = await releaseG5(
      page,
      nvda,
      network,
      "success",
      async () => {
        await expect(
          page.getByRole("button", { name: "Copier le token", exact: true }),
        ).toBeVisible();
      },
      "personal-token-created-native",
      info,
    );
    expect(created.text).toContain(normalizeSpeech("Token créé avec succès"));
    await expect(page.locator("code.token-value")).toHaveText(fakeToken);
    const copy = page.getByRole("button", {
      name: "Copier le token",
      exact: true,
    });
    await reachG5(nvda, copy, "Copier le token", info);
    // First, exercise the product's clipboard-error handler. Restore the
    // prototype API before the real Windows copy; no prior clipboard is read.
    const originalOwn = await page.evaluate(() =>
      Object.prototype.hasOwnProperty.call(navigator, "clipboard"),
    );
    expect(originalOwn).toBe(false);
    await page.evaluate(() =>
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async () => {
            throw new Error("Synthetic clipboard refusal");
          },
        },
      }),
    );
    const copyFailed = await activateCurrent(
      nvda,
      info,
      "personal-token-copy-refused",
    );
    const copyFailure = await captureStep(
      nvda,
      "personal-token-copy-error-settled",
      async () => {
        await nvda.capture(
          async () => {
            await expect(
              page
                .getByRole("alert")
                .filter({ hasText: "Impossible de copier le token" }),
            ).toBeVisible();
            await page.waitForTimeout(1200);
          },
          { capture: true },
        );
      },
      info,
    );
    expect(`${copyFailed.text} ${copyFailure.text}`).toContain(
      normalizeSpeech("Impossible de copier le token"),
    );
    await expect(copy).toBeFocused();
    await page.evaluate(() => Reflect.deleteProperty(navigator, "clipboard"));
    const copied = await activateCurrent(
      nvda,
      info,
      "personal-token-copy-real-windows",
    );
    const copySettled = await captureStep(
      nvda,
      "personal-token-copy-real-status",
      async () => {
        await nvda.capture(
          async () => {
            await expect(page.getByRole("status")).toHaveText(
              "Token copié dans le presse-papier",
            );
            await page.waitForTimeout(1200);
          },
          { capture: true },
        );
      },
      info,
    );
    expect(`${copied.text} ${copySettled.text}`).toContain(
      normalizeSpeech("Token copié dans le presse-papier"),
    );
    await expect(copy).toBeFocused();
    const { stdout } = await execFileAsync("pwsh.exe", [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      String.raw`
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSHOME 'Modules/Microsoft.PowerShell.Management/Microsoft.PowerShell.Management.psd1')
$copiedMatches = (Get-Clipboard -Raw) -ceq 'SYNTHETIC_G5_TOKEN_NOT_A_CREDENTIAL'
$copiedMatches.ToString()
`,
    ]);
    expect(stdout.trim()).toBe("True");
    await info.attach("personal-token-real-clipboard", {
      body: JSON.stringify({
        syntheticValueMatches: stdout.trim() === "True",
        clipboardContentsRecorded: false,
      }),
      contentType: "application/json",
    });
    const revoke = page.getByRole("button", {
      name: "Révoquer le token Service G5",
      exact: true,
    });
    await reachG5(nvda, revoke, "Révoquer le token Service G5", info);
    await activateCurrent(nvda, info, "personal-token-revoke-open");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const confirm = dialog.getByRole("button", {
      name: "Révoquer",
      exact: true,
    });
    await submitNative(
      page,
      nvda,
      confirm,
      "Révoquer",
      info,
      "personal-token-revoke-failure",
    );
    const revokeFailed = await releaseG5(
      page,
      nvda,
      network,
      "error",
      async () => {
        await expect(dialog).not.toBeVisible();
        await expect(revoke).toBeFocused();
      },
      "personal-token-revoke-error-native",
      info,
    );
    expect(revokeFailed.text).toContain(
      normalizeSpeech("Erreur lors de la révocation du token"),
    );
    await activateCurrent(nvda, info, "personal-token-revoke-reopen");
    await submitNative(
      page,
      nvda,
      confirm,
      "Révoquer",
      info,
      "personal-token-revoke-retry",
    );
    const revoked = await releaseG5(
      page,
      nvda,
      network,
      "success",
      async () => {
        await expect(dialog).not.toBeVisible();
        await expect(revoke).toHaveCount(0);
      },
      "personal-token-revoked-native",
      info,
    );
    expect(revoked.text).toContain(
      normalizeSpeech("Token révoqué avec succès"),
    );
    expect(
      network.g5Calls.filter((call) => call.method === "DELETE"),
    ).toHaveLength(2);
    await finishG5(page, network, info);
  } finally {
    network.cancelPending();
  }
});

test("AT-G5-PREFERENCES — e-mail refusé puis enregistré, état et focus conservés", async ({
  page,
  browser,
  nvda,
}, info) => {
  const network = await profileNotificationsNetwork(page);
  try {
    await startScene(
      page,
      nvda,
      network.base,
      browser.version(),
      "profile",
      info,
    );
    const toggle = page.getByRole("checkbox", {
      name: "Recevoir les notifications par email",
    });
    const initial = await reachG5(
      nvda,
      toggle,
      "Recevoir les notifications par email",
      info,
    );
    expect(initial.text).toMatch(
      /case.*(?:non coche|pas coche)|(?:non coche|pas coche).*case/,
    );
    await captureStep(
      nvda,
      "preference-toggle-on",
      () => nvda.press("Space", { capture: true }),
      info,
    );
    const refused = await releaseG5(
      page,
      nvda,
      network,
      "error",
      async () => {
        await expect(toggle).not.toBeChecked();
        await expect(toggle).toBeFocused();
      },
      "preference-rejected-native",
      info,
    );
    expect(refused.text).toContain(
      normalizeSpeech("Erreur lors de la mise à jour de vos préférences"),
    );
    await captureStep(
      nvda,
      "preference-toggle-retry",
      () => nvda.press("Space", { capture: true }),
      info,
    );
    const saved = await releaseG5(
      page,
      nvda,
      network,
      "success",
      async () => {
        await expect(toggle).toBeChecked();
        await expect(toggle).toBeFocused();
      },
      "preference-saved-native",
      info,
    );
    expect(saved.text).toContain(
      normalizeSpeech(
        "Vos préférences de notification ont été mises à jour avec succès",
      ),
    );
    expect(
      network.g5Calls.filter((call) => call.method === "PATCH"),
    ).toHaveLength(2);
    await finishG5(page, network, info);
  } finally {
    network.cancelPending();
  }
});

test("AT-G5-SUBSCRIPTIONS — désabonnement refusé, premier puis dernier abonnement", async ({
  page,
  browser,
  nvda,
}, info) => {
  const network = await profileNotificationsNetwork(page);
  try {
    await startScene(
      page,
      nvda,
      network.base,
      browser.version(),
      "profile",
      info,
    );
    await chooseProfileTab(page, nvda, 2, info);
    const alpha = page.getByRole("button", {
      name: "Désabonner de l’application Application fictive Alpha",
      exact: true,
    });
    await reachG5(
      nvda,
      alpha,
      "Désabonner de l’application Application fictive Alpha",
      info,
    );
    await activateCurrent(nvda, info, "unsubscribe-alpha-failure");
    const refused = await releaseG5(
      page,
      nvda,
      network,
      "error",
      async () => {
        await expect(alpha).toBeEnabled();
        await expect(alpha).toBeFocused();
      },
      "unsubscribe-error-native",
      info,
    );
    expect(refused.text).toContain(
      normalizeSpeech("Erreur lors du désabonnement"),
    );
    await activateCurrent(nvda, info, "unsubscribe-alpha-retry");
    const beta = page.getByRole("button", {
      name: "Désabonner de l’application Application fictive Bêta",
      exact: true,
    });
    const first = await releaseG5(
      page,
      nvda,
      network,
      "success",
      async () => {
        await expect(alpha).toHaveCount(0);
        await expect(beta).toBeFocused();
      },
      "unsubscribe-alpha-success-native",
      info,
    );
    expect(first.text).toContain(
      normalizeSpeech(
        "Vous avez été désabonné(e) de l’application Application fictive Alpha",
      ),
    );
    const betaFocus = await captureStep(
      nvda,
      "unsubscribe-next-action-name",
      () =>
        nvda.perform(nvda.keyboardCommands.reportCurrentFocus, {
          capture: true,
        }),
      info,
    );
    expect(betaFocus.text).toContain(
      normalizeSpeech("Désabonner de l’application Application fictive Bêta"),
    );
    await activateCurrent(nvda, info, "unsubscribe-last");
    const last = await releaseG5(
      page,
      nvda,
      network,
      "success",
      async () => {
        await expect(beta).toHaveCount(0);
        await expect(
          page.getByRole("heading", {
            name: "Applications suivies",
            exact: true,
          }),
        ).toBeFocused();
      },
      "unsubscribe-empty-native",
      info,
    );
    expect(last.text).toContain(
      normalizeSpeech(
        "Vous avez été désabonné(e) de l’application Application fictive Bêta",
      ),
    );
    await expect(
      page.getByText("Aucune application suivie", { exact: true }),
    ).toBeVisible();
    expect(
      network.g5Calls.filter((call) => call.method === "DELETE"),
    ).toHaveLength(3);
    await finishG5(page, network, info);
  } finally {
    network.cancelPending();
  }
});

test("AT-G5-NOTIFICATIONS — marquage et suppressions individuelles/sélectionnées refusées puis réussies", async ({
  page,
  browser,
  nvda,
}, info) => {
  const network = await profileNotificationsNetwork(page);
  try {
    await startScene(
      page,
      nvda,
      network.base,
      browser.version(),
      "notifications",
      info,
    );
    const mark = page.getByTestId("notifications-page-mark-all-read");
    await submitNative(
      page,
      nvda,
      mark,
      "Tout marquer comme lu",
      info,
      "notice-mark-all-failure",
    );
    const markFailed = await releaseG5(
      page,
      nvda,
      network,
      "error",
      async () => {
        await expect(mark).toHaveAttribute("aria-disabled", "false");
        await expect(mark).toBeFocused();
      },
      "notice-mark-all-error-native",
      info,
    );
    expect(markFailed.text).toContain(
      normalizeSpeech("Erreur lors du marquage des notifications comme lues"),
    );
    await submitNative(
      page,
      nvda,
      mark,
      "Tout marquer comme lu",
      info,
      "notice-mark-all-retry",
    );
    const marked = await releaseG5(
      page,
      nvda,
      network,
      "success",
      async () => {
        await expect(mark).toHaveCount(0);
        await expect(
          page.getByTestId("notifications-page-title"),
        ).toBeFocused();
      },
      "notice-marked-native",
      info,
    );
    expect(marked.text).toContain(
      normalizeSpeech("Toutes les notifications ont été marquées comme lues"),
    );
    const rows = page.getByTestId("notification-row-delete");
    await reachG5(nvda, rows.first(), "Supprimer", info);
    await activateCurrent(nvda, info, "notice-delete-one-open");
    const confirm = page.getByTestId("delete-confirm-btn");
    await submitNative(
      page,
      nvda,
      confirm,
      "Confirmer",
      info,
      "notice-delete-one-failure",
    );
    const oneFailed = await releaseG5(
      page,
      nvda,
      network,
      "error",
      async () => {
        await expect(confirm).toBeFocused();
        await expect(
          page.getByTestId("delete-confirmation-error"),
        ).toContainText("La suppression a échoué");
      },
      "notice-delete-one-error-native",
      info,
    );
    expect(oneFailed.text).toContain(
      normalizeSpeech("La suppression a échoué"),
    );
    await expect(rows).toHaveCount(3);
    await submitNative(
      page,
      nvda,
      confirm,
      "Confirmer",
      info,
      "notice-delete-one-retry",
    );
    const oneDeleted = await releaseG5(
      page,
      nvda,
      network,
      "success",
      async () => {
        await expect(page.getByRole("dialog")).not.toBeVisible();
        await expect(rows).toHaveCount(2);
        await expect(rows.first()).toBeFocused();
      },
      "notice-one-deleted-native",
      info,
    );
    expect(oneDeleted.text).toContain(
      normalizeSpeech("La notification a été supprimée"),
    );
    const all = page.getByRole("checkbox", {
      name: "Tout sélectionner",
      exact: true,
    });
    await reachG5(nvda, all, "Tout sélectionner", info);
    const selected = await captureStep(
      nvda,
      "notice-select-all",
      () => nvda.press("Space", { capture: true }),
      info,
    );
    expect(selected.text).toMatch(/coche/);
    const selection = page.getByTestId("notifications-page-delete-selection");
    await expect(selection).toHaveText("Supprimer la sélection (2)");
    await reachG5(nvda, selection, /supprimer la selection.*(?:2|deux)/, info);
    await activateCurrent(nvda, info, "notice-delete-selection-open");
    await submitNative(
      page,
      nvda,
      confirm,
      "Confirmer",
      info,
      "notice-delete-selection-failure",
    );
    const manyFailed = await releaseG5(
      page,
      nvda,
      network,
      "error",
      async () => {
        await expect(confirm).toBeFocused();
        await expect(selection).toHaveText("Supprimer la sélection (2)");
      },
      "notice-selection-preserved-native",
      info,
    );
    expect(manyFailed.text).toContain(
      normalizeSpeech(
        "Les notifications et votre sélection ont été conservées",
      ),
    );
    await expect(rows).toHaveCount(2);
    await submitNative(
      page,
      nvda,
      confirm,
      "Confirmer",
      info,
      "notice-delete-selection-retry",
    );
    const manyDeleted = await releaseG5(
      page,
      nvda,
      network,
      "success",
      async () => {
        await expect(page.getByRole("dialog")).not.toBeVisible();
        await expect(rows).toHaveCount(0);
        await expect(
          page.getByTestId("notifications-page-title"),
        ).toBeFocused();
      },
      "notice-selection-deleted-native",
      info,
    );
    expect(manyDeleted.text).toMatch(
      /\b(?:2|deux) notifications ont ete supprimees/,
    );
    expect(
      network.g5Calls.filter((call) => call.method === "PATCH"),
    ).toHaveLength(2);
    expect(
      network.g5Calls.filter((call) => call.method === "DELETE"),
    ).toHaveLength(4);
    await finishG5(page, network, info);
  } finally {
    network.cancelPending();
  }
});

test("AT-G5-BELL — marquage depuis la cloche, échec puis succès sans fermer le panneau", async ({
  page,
  browser,
  nvda,
}, info) => {
  const network = await profileNotificationsNetwork(page);
  try {
    await startScene(page, nvda, network.base, browser.version(), "bell", info);
    const bell = page.getByTestId("notification-bell-button");
    await reachG5(nvda, bell, /notifications.*(?:3|trois) non lues/, info);
    await activateCurrent(nvda, info, "bell-open");
    const mark = page.getByTestId("notification-mark-all-read");
    await submitNative(
      page,
      nvda,
      mark,
      "Tout marquer comme lu",
      info,
      "bell-mark-all-failure",
    );
    const failed = await releaseG5(
      page,
      nvda,
      network,
      "error",
      async () => {
        await expect(mark).toHaveAttribute("aria-disabled", "false");
        await expect(mark).toBeFocused();
      },
      "bell-mark-error-native",
      info,
    );
    expect(failed.text).toContain(
      normalizeSpeech("Erreur lors du marquage des notifications comme lues"),
    );
    await submitNative(
      page,
      nvda,
      mark,
      "Tout marquer comme lu",
      info,
      "bell-mark-all-retry",
    );
    const marked = await releaseG5(
      page,
      nvda,
      network,
      "success",
      async () => {
        await expect(mark).toHaveCount(0);
        await expect(bell).toBeFocused();
      },
      "bell-marked-native",
      info,
    );
    expect(marked.text).toContain(
      normalizeSpeech("Toutes les notifications ont été marquées comme lues"),
    );
    await expect(page.getByTestId("notification-bell-panel")).toBeVisible();
    const current = await captureStep(
      nvda,
      "bell-empty-unread-name",
      () =>
        nvda.perform(nvda.keyboardCommands.reportCurrentFocus, {
          capture: true,
        }),
      info,
    );
    expect(current.text).toContain("notifications");
    expect(current.text).not.toContain("non lue");
    expect(
      network.g5Calls.filter((call) => call.method === "PATCH"),
    ).toHaveLength(2);
    await finishG5(page, network, info);
  } finally {
    network.cancelPending();
  }
});
