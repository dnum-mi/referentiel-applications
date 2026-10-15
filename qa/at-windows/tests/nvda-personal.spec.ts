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
import { activateCurrent, tabTo } from "./native-utils.js";
import {
  personalNetwork,
  mountPersonalScene,
  finishPersonal,
  observePersonal,
  personalActorTypeId,
  personalUserId,
} from "./personal-interactive-utils.js";

test.use({ serviceWorkers: "block" });
test.beforeEach(async ({}, info) => {
  info.setTimeout(600_000);
  info.annotations.push({
    type: "RGAA",
    description:
      "7.1.2 — G1–G3 : véritables UserActions, UserPermissions et matrice persistée ; API fictive, seule la parole NVDA native qualifie la restitution",
  });
});

// A repeated name is located through the DOM, then reached only with native
// keys. The arrival and current-focus phrases belong to this control alone.
async function reach(
  nvda: NVDAPlaywright,
  target: Locator,
  name: string | RegExp,
  info: TestInfo,
) {
  await expect(target).toBeVisible();
  const direction = await target.evaluate((element) =>
    document.activeElement &&
    document.activeElement !== document.body &&
    document.activeElement.compareDocumentPosition(element) &
      Node.DOCUMENT_POSITION_PRECEDING
      ? "Shift+Tab"
      : "Tab",
  );
  let arrival: Awaited<ReturnType<typeof captureStep>> | undefined;
  for (let index = 0; index < 55; index++) {
    if (
      await target.evaluate(
        (element) =>
          element === document.activeElement ||
          element.contains(document.activeElement),
      )
    ) {
      if (index === 0) {
        await captureStep(
          nvda,
          "personal-focus-round-trip-away",
          () =>
            nvda.press(direction === "Tab" ? "Shift+Tab" : "Tab", {
              capture: true,
            }),
          info,
        );
        arrival = await captureStep(
          nvda,
          "personal-focus-round-trip-return",
          () => nvda.press(direction, { capture: true }),
          info,
        );
        await expect(target).toBeFocused();
      }
      const current = await captureStep(
        nvda,
        "personal-current-focus",
        () =>
          nvda.perform(nvda.keyboardCommands.reportCurrentFocus, {
            capture: true,
          }),
        info,
      );
      const phrases = [...(arrival?.phrases ?? []), ...current.phrases],
        text = normalizeSpeech(phrases.join(" "));
      if (typeof name === "string")
        expect(text).toContain(normalizeSpeech(name));
      else expect(text).toMatch(name);
      return { phrases, text };
    }
    arrival = await captureStep(
      nvda,
      `personal-native-${direction}-${index}`,
      () => nvda.press(direction, { capture: true }),
      info,
    );
  }
  throw new Error(`Commande non atteinte par clavier natif : ${String(name)}`);
}

async function releaseReply(
  page: Page,
  nvda: NVDAPlaywright,
  network: Awaited<ReturnType<typeof personalNetwork>>,
  kind: "suggestion" | "user" | "sync" | "matrix",
  settled: () => Promise<void>,
  step: string,
  info: TestInfo,
) {
  await expect
    .poll(() => network.pending.some((pending) => pending.kind === kind))
    .toBe(true);
  return captureStep(
    nvda,
    step,
    async () => {
      await nvda.capture(
        async () => {
          network.release(kind);
          await settled();
          await page.waitForTimeout(1200);
        },
        { capture: true },
      );
    },
    info,
  );
}

async function confirmNative(
  page: Page,
  nvda: NVDAPlaywright,
  info: TestInfo,
  message: string,
  spokenMessage: string,
  agreement: boolean,
  step: string,
) {
  // Register first so Playwright never auto-dismisses the real browser dialog.
  const event = page.waitForEvent("dialog");
  const opening = await activateCurrent(nvda, info, `${step}-open`);
  const confirmation = await event;
  expect(confirmation.type()).toBe("confirm");
  expect(confirmation.message()).toBe(message);
  expect(opening.text).toContain(normalizeSpeech(spokenMessage));
  const choice = await tabTo(
    nvda,
    agreement ? /\bok\b.*bouton/ : /annuler.*bouton/,
    info,
    4,
  );
  expect(choice.text).toContain("bouton");
  await activateCurrent(
    nvda,
    info,
    `${step}-${agreement ? "agree" : "refuse"}`,
  );
}

test("AT-PERSONAL-G1 — édition utilisateur, périmètre, confirmation et MAIA individuel", async ({
  page,
  browser,
  nvda,
}, info) => {
  const network = await personalNetwork(page);
  network.hold("suggestion");
  try {
    await mountPersonalScene(page, network, "user");
    await attachIdentity(nvda, browser.version(), info);
    await focusDocumentStart(page, nvda);
    const opener = page.getByTestId("admin-user-edit-btn");
    const openerSpeech = await reach(
      nvda,
      opener,
      "Modifier les permissions de l'utilisateur",
      info,
    );
    expect(openerSpeech.text).toContain("bouton");
    const opening = await activateCurrent(nvda, info, "personal-edit-open");
    const dialog = page.getByRole("dialog", {
      name: "Modifier l'utilisateur",
      exact: true,
    });
    await expect(dialog).toBeVisible();
    expect(opening.text).toMatch(/dialogue|dialog/);
    expect(opening.text).toContain("modifier l utilisateur");
    const suggestionError = await releaseReply(
      page,
      nvda,
      network,
      "suggestion",
      async () => {
        await expect(
          dialog.getByTestId("user-maia-suggestion").getByRole("alert"),
        ).toContainText("Impossible de récupérer la suggestion MAIA");
      },
      "personal-suggestion500",
      info,
    );
    expect(suggestionError.text).toContain(
      "impossible de recuperer la suggestion maia",
    );
    network.personalState.suggestionMode = "success";
    network.hold("suggestion");
    await reach(
      nvda,
      dialog.getByRole("button", {
        name: "Réessayer la recherche MAIA",
        exact: true,
      }),
      "Réessayer la recherche MAIA",
      info,
    );
    await activateCurrent(nvda, info, "personal-suggestion-retry");
    const suggestion = await releaseReply(
      page,
      nvda,
      network,
      "suggestion",
      async () => {
        await expect(
          dialog.getByTestId("user-org-not-validated-badge"),
        ).toHaveText("NON VALIDÉE");
      },
      "personal-suggestion-success",
      info,
    );
    expect(suggestion.text).toContain("organisation maia");
    expect(suggestion.text).toContain("non validee");
    const organizationGroup = dialog.getByTestId("user-organization-search");
    const search = organizationGroup.getByRole("textbox");
    await reach(nvda, search, /organisation.*edition/, info);
    await captureStep(
      nvda,
      "personal-search-organization",
      () => nvda.type("Organisation", { capture: true }),
      info,
    );
    const select = organizationGroup.getByRole("combobox");
    await expect(
      select.locator('option[value="org-personal-selected"]'),
    ).toHaveCount(1);
    await reach(nvda, select, "Choisir une organisation de votre choix", info);
    const targetIndex = await select.evaluate((element) =>
      Array.from(element.querySelectorAll("option"))
        .filter((option) => !option.disabled)
        .findIndex((option) => option.value === "org-personal-selected"),
    );
    expect(targetIndex).toBeGreaterThanOrEqual(0);
    const chosen = await captureStep(
      nvda,
      "personal-select-organization-native",
      async () => {
        // Open the real native picker. Closed-select ArrowDown commits each
        // intermediate value and restarts the consumer's organisation search.
        await nvda.press("Alt+ArrowDown", { capture: true });
        await nvda.press("Home", { capture: true });
        for (let index = 0; index < targetIndex; index++) {
          await nvda.press("ArrowDown", { capture: true });
        }
        await nvda.press("Enter", { capture: true });
      },
      info,
    );
    await expect(select).toHaveValue("org-personal-selected");
    await expect(select).toBeEnabled();
    await expect(dialog.getByTestId("user-org-not-validated-badge")).toHaveText(
      "VALIDÉE",
    );
    expect(chosen.text).toContain("organisation choisie fictive");
    const reader = dialog.locator("#admin-level-reader");
    const role = await reach(nvda, reader, "Lecture totale", info);
    expect(role.text).toMatch(/bouton radio|case d option/);
    const visitor = await captureStep(
      nvda,
      "personal-role-visitor",
      () => nvda.press("ArrowUp", { capture: true }),
      info,
    );
    await expect(dialog.locator("#admin-level-visitor")).toBeChecked();
    await expect(
      dialog.getByTestId("user-organization-search-scope"),
    ).not.toBeVisible();
    expect(visitor.text).toContain("utilisateur");
    const contributor = await captureStep(
      nvda,
      "personal-role-contributor",
      async () => {
        await nvda.press("ArrowDown", { capture: true });
        await nvda.press("ArrowDown", { capture: true });
      },
      info,
    );
    await expect(dialog.locator("#admin-level-contributor")).toBeChecked();
    await expect(
      dialog.getByTestId("user-organization-search-scope"),
    ).toBeVisible();
    expect(contributor.text).toContain("ecriture totale");
    expect(contributor.text).toMatch(/coche|selectionne/);
    const capability = dialog.getByRole("checkbox", {
      name: "Gérer les campagnes dette IT",
      exact: true,
    });
    const capabilitySpeech = await reach(
      nvda,
      capability,
      "Gérer les campagnes dette IT",
      info,
    );
    expect(capabilitySpeech.text).toMatch(/case.*cocher/);
    const capabilityEnabled = await captureStep(
      nvda,
      "personal-toggle-capability",
      () => nvda.press("Space", { capture: true }),
      info,
    );
    await expect(capability).toBeChecked();
    expect(capabilityEnabled.text).toMatch(/\bcochee?\b|selectionne/);
    expect(capabilityEnabled.text).not.toContain("non coche");
    const save = dialog.getByTestId("admin-save-perms-btn");
    await reach(nvda, save, "Enregistrer les modifications", info);
    const editMessage = `Confirmer la modification de l'utilisateur « ${network.target.email} » ?\n\nLes organisations, le niveau de privilège et les capacités affichés seront enregistrés.`;
    await confirmNative(
      page,
      nvda,
      info,
      editMessage,
      "Confirmer la modification de l'utilisateur",
      false,
      "personal-user-confirmation-refused",
    );
    expect(
      network.personalStarted.filter(
        (call) =>
          call.method === "PATCH" && call.pathname.endsWith(personalUserId),
      ),
    ).toHaveLength(0);
    await expect(dialog.locator("#admin-level-contributor")).toBeChecked();
    await expect(select).toHaveValue("org-personal-selected");
    await reach(nvda, save, "Enregistrer les modifications", info);
    network.hold("user");
    await confirmNative(
      page,
      nvda,
      info,
      editMessage,
      "Confirmer la modification de l'utilisateur",
      true,
      "personal-user-confirmation-agreed",
    );
    const refused = await releaseReply(
      page,
      nvda,
      network,
      "user",
      async () => {
        await expect(dialog.getByTestId("user-edit-error")).toContainText(
          "Modification utilisateur fictivement refusée",
        );
      },
      "personal-user500",
      info,
    );
    expect(refused.text).toContain(
      "modification utilisateur fictivement refusee",
    );
    await expect(save).toBeFocused();
    await expect(select).toHaveValue("org-personal-selected");
    await expect(capability).toBeChecked();
    network.personalState.userMode = "success";
    network.hold("user");
    await reach(nvda, save, "Enregistrer les modifications", info);
    await confirmNative(
      page,
      nvda,
      info,
      editMessage,
      "Confirmer la modification de l'utilisateur",
      true,
      "personal-user-retry-confirmation",
    );
    const success = await releaseReply(
      page,
      nvda,
      network,
      "user",
      async () => {
        await expect(dialog).not.toBeVisible();
        await expect(opener).toBeFocused();
      },
      "personal-user-save-success",
      info,
    );
    expect(success.text).toContain("utilisateur mis a jour avec succes");
    const maia = page.getByTestId("admin-user-sync-maia-btn");
    await reach(nvda, maia, "Synchroniser l'organisation depuis MAIA", info);
    const maiaMessage = `Confirmer la synchronisation de l'organisation de l'utilisateur « ${network.target.email} » depuis MAIA ?\n\nSon organisation actuelle sera remplacée par celle renvoyée par MAIA.`;
    await confirmNative(
      page,
      nvda,
      info,
      maiaMessage,
      "Confirmer la synchronisation",
      false,
      "personal-maia-confirmation-refused",
    );
    expect(
      network.personalStarted.filter((call) => call.method === "POST"),
    ).toHaveLength(0);
    network.hold("sync");
    await reach(nvda, maia, "Synchroniser l'organisation depuis MAIA", info);
    await confirmNative(
      page,
      nvda,
      info,
      maiaMessage,
      "Confirmer la synchronisation",
      true,
      "personal-maia-confirmation-agreed",
    );
    const maiaError = await releaseReply(
      page,
      nvda,
      network,
      "sync",
      async () => {
        await expect(
          page.getByTestId("app-toaster").getByRole("alert"),
        ).toContainText("Erreur lors de la synchronisation MAIA");
      },
      "personal-maia500",
      info,
    );
    expect(maiaError.text).toContain("erreur lors de la synchronisation maia");
    await expect(maia).toBeFocused();
    network.personalState.syncMode = "success";
    network.hold("sync");
    await reach(nvda, maia, "Synchroniser l'organisation depuis MAIA", info);
    await confirmNative(
      page,
      nvda,
      info,
      maiaMessage,
      "Confirmer la synchronisation",
      true,
      "personal-maia-retry-confirmation",
    );
    const maiaSuccess = await releaseReply(
      page,
      nvda,
      network,
      "sync",
      async () => {
        await expect(
          page.getByTestId("app-toaster").getByRole("status"),
        ).toContainText("Organisation synchronisée depuis MAIA");
      },
      "personal-maia-success",
      info,
    );
    expect(maiaSuccess.text).toContain("organisation synchronisee depuis maia");
    await expect(maia).toBeFocused();
    await observePersonal(page, info, "personal-user-final");
    await finishPersonal(page, network, info);
  } finally {
    network.cancelPending();
  }
});

test("AT-PERSONAL-G2 — lecture des permissions par rôle/périmètre et session limitée", async ({
  page,
  browser,
  nvda,
}, info) => {
  await attachIdentity(nvda, browser.version(), info);
  for (const downgraded of [false, true]) {
    const network = await personalNetwork(page, { downgraded });
    await mountPersonalScene(page, network, "permissions");
    await focusDocumentStart(page, nvda);
    const opener = page.getByTestId("admin-user-permissions-btn");
    const openerSpeech = await reach(
      nvda,
      opener,
      "Voir les permissions de l'utilisateur",
      info,
    );
    expect(openerSpeech.text).toContain("bouton");
    const opening = await activateCurrent(
      nvda,
      info,
      downgraded
        ? "personal-permissions-limited-open"
        : "personal-permissions-scoped-open",
    );
    const dialog = page.getByRole("dialog", {
      name: `Permissions de l'utilisateur — ${network.target.email}`,
      exact: true,
    });
    await expect(dialog).toBeVisible();
    expect(opening.text).toMatch(/dialogue|dialog/);
    expect(opening.text).toContain("permissions de l utilisateur");
    const reading = await captureStep(
      nvda,
      downgraded
        ? "personal-permissions-limited-reading"
        : "personal-permissions-scoped-reading",
      () => nvda.perform(nvda.keyboardCommands.sayAll, { capture: true }),
      info,
    );
    if (downgraded) {
      expect(reading.text).toContain("droits limites");
      expect(reading.text).toContain("permissions effectives");
      expect(reading.text).toContain("aucune permission");
    } else {
      expect(reading.text).toContain("lecture totale");
      expect(reading.text).toContain("perimetre personnel fictif");
      expect(reading.text).toContain("voir les informations de base");
      expect(reading.text).toContain("voir l historique des modifications");
      expect(reading.text).toContain("creer une application");
    }
    await reach(
      nvda,
      dialog.getByRole("button", { name: "Fermer", exact: true }),
      "Fermer",
      info,
    );
    await activateCurrent(nvda, info, "personal-permissions-close");
    await expect(dialog).not.toBeVisible();
    await expect(opener).toBeFocused();
    expect(network.personalStarted).toHaveLength(0);
    await finishPersonal(page, network, info);
  }
});

test("AT-PERSONAL-G3 — matrice, refus500, brouillon/focus puis persistance et relecture", async ({
  page,
  browser,
  nvda,
}, info) => {
  const network = await personalNetwork(page);
  try {
    await mountPersonalScene(page, network, "matrix");
    await attachIdentity(nvda, browser.version(), info);
    await focusDocumentStart(page, nvda);
    const link = page.getByTestId(
      `app-perms-select-${personalActorTypeId}-Link`,
    );
    const control = await reach(nvda, link, "Sélection actuelle", info);
    expect(control.text).toContain("bouton");
    expect(control.text).toContain("aucun droit");
    await activateCurrent(nvda, info, "personal-matrix-link-read");
    await expect(link).toHaveAttribute("data-state", "Read");
    const read = await captureStep(
      nvda,
      "personal-matrix-read-state",
      () =>
        nvda.perform(nvda.keyboardCommands.reportCurrentFocus, {
          capture: true,
        }),
      info,
    );
    expect(read.text).toContain("lecture seule");
    await activateCurrent(nvda, info, "personal-matrix-link-write");
    await expect(link).toHaveAttribute("data-state", "Write");
    const write = await captureStep(
      nvda,
      "personal-matrix-write-state",
      () =>
        nvda.perform(nvda.keyboardCommands.reportCurrentFocus, {
          capture: true,
        }),
      info,
    );
    expect(write.text).toContain("lecture et ecriture");
    const save = page.getByTestId("app-perms-save-btn");
    await reach(nvda, save, "Enregistrer les modifications", info);
    network.hold("matrix");
    const waiting = await activateCurrent(
      nvda,
      info,
      "personal-matrix-save-start",
    );
    await expect(save).toHaveAttribute("aria-disabled", "true");
    await expect(save).toBeFocused();
    expect(waiting.text).toContain("enregistrement de la matrice");
    await activateCurrent(nvda, info, "personal-matrix-double-submit-guard");
    expect(
      network.personalStarted.filter((call) =>
        call.pathname.endsWith("perms-matrix"),
      ),
    ).toHaveLength(1);
    const refusal = await releaseReply(
      page,
      nvda,
      network,
      "matrix",
      async () => {
        await expect(page.getByTestId("app-perms-matrix-error")).toContainText(
          "Votre saisie est conservée",
        );
      },
      "personal-matrix500",
      info,
    );
    expect(refusal.text).toContain(
      "erreur lors de la mise a jour de la matrice",
    );
    expect(refusal.text).toContain("votre saisie est conservee");
    await expect(save).toBeFocused();
    await expect(link).toHaveAttribute("data-state", "Write");
    await observePersonal(page, info, "personal-matrix500-fixed");
    network.personalState.matrixMode = "success";
    network.hold("matrix");
    await reach(nvda, save, "Enregistrer les modifications", info);
    await activateCurrent(nvda, info, "personal-matrix-retry-start");
    const saved = await releaseReply(
      page,
      nvda,
      network,
      "matrix",
      async () => {
        await expect(page.getByTestId("app-perms-matrix-status")).toContainText(
          "Matrice des permissions mise à jour avec succès",
        );
      },
      "personal-matrix-reloaded-success",
      info,
    );
    expect(saved.text).toContain(
      "matrice des permissions mise a jour avec succes",
    );
    await expect(save).toBeFocused();
    expect(network.persistedMatrix()[0].LinkWrite).toBe(true);
    const persisted = await reach(nvda, link, "Sélection actuelle", info);
    expect(persisted.text).toContain("lecture et ecriture");
    expect(
      network.personalStarted.filter((call) =>
        call.pathname.endsWith("perms-matrix"),
      ),
    ).toHaveLength(2);
    expect(
      network.personalCalls.filter(
        (call) =>
          call.method === "GET" && call.pathname.endsWith("perms-matrix"),
      ),
    ).toHaveLength(2);
    await finishPersonal(page, network, info);
  } finally {
    network.cancelPending();
  }
});
