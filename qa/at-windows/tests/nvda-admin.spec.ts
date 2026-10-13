import { expect } from "@playwright/test";
import {
  test,
  attachIdentity,
  captureStep,
  focusDocumentStart,
  normalizeSpeech,
} from "./fixture.js";
import {
  activateCurrent,
  tabTo,
  passKeyToApplication,
} from "./native-utils.js";
import {
  adminNetwork,
  finishAdmin,
  mountAdminScene,
} from "./admin-interactive-utils.js";

test.use({ serviceWorkers: "block" });
test.beforeEach(async ({}, info) => {
  info.setTimeout(420_000);
  info.annotations.push({
    type: "RGAA",
    description:
      "7.1.2 — U14, trois composants parents réels, API entièrement synthétique ; seules les annonces natives constituent la restitution",
  });
});

test("AT-INT-U14-quality — sponsors au clavier, erreur de suppression puis réessai", async ({
  page,
  browser,
  nvda,
}, info) => {
  const network = await adminNetwork(page);
  try {
    await page.goto(network.base);
    await mountAdminScene(page, "quality");
    await attachIdentity(nvda, browser.version(), info);
    await focusDocumentStart(page, nvda);
    expect((await tabTo(nvda, "Modifier la campagne", info)).text).toContain(
      "bouton",
    );
    await expect(
      page.getByTestId("admin-quality-campaign-edit-btn"),
    ).toBeFocused();
    const opened = await activateCurrent(nvda, info, "quality-edit-open");
    expect(opened.text).toContain(normalizeSpeech("Modifier la campagne"));
    await expect(
      page.getByTestId("admin-edit-quality-campaign-modal"),
    ).toBeVisible();
    await tabTo(nvda, "Supprimer le sponsor 2", info);
    await activateCurrent(nvda, info, "quality-remove-last-sponsor");
    await expect(
      page.getByRole("textbox", { name: "Email du sponsor 1" }),
    ).toBeFocused();
    const first = await captureStep(
      nvda,
      "quality-surviving-sponsor",
      () =>
        nvda.perform(nvda.keyboardCommands.reportCurrentFocus, {
          capture: true,
        }),
      info,
    );
    expect(first.text).toContain(normalizeSpeech("Email du sponsor 1"));
    expect(
      ["premier@example.invalid", "premier arobase example point invalid"].some(
        (address) => first.text.includes(normalizeSpeech(address)),
      ),
    ).toBe(true);
    await tabTo(nvda, "Supprimer le sponsor 1", info);
    await activateCurrent(nvda, info, "quality-remove-all-sponsors");
    await expect(
      page.getByTestId("quality-campaign-sponsor-email-add"),
    ).toBeFocused();
    const add = await captureStep(
      nvda,
      "quality-empty-sponsors-command",
      () =>
        nvda.perform(nvda.keyboardCommands.reportCurrentFocus, {
          capture: true,
        }),
      info,
    );
    expect(add.text).toContain(normalizeSpeech("Ajouter un sponsor"));
    await activateCurrent(nvda, info, "quality-add-sponsor");
    const email = page.getByRole("textbox", { name: "Email du sponsor 1" });
    await expect(email).toBeFocused();
    await captureStep(
      nvda,
      "quality-sponsor-select-all",
      () => nvda.press("Control+a", { capture: true }),
      info,
    );
    const invalid = await captureStep(
      nvda,
      "quality-sponsor-invalid",
      () => nvda.type("adresseinvalide", { capture: true }),
      info,
    );
    await expect(email).toHaveValue("adresseinvalide");
    expect(invalid.text).toContain(normalizeSpeech("Email invalide"));
    await captureStep(
      nvda,
      "quality-sponsor-fix-select-all",
      () => nvda.press("Control+a", { capture: true }),
      info,
    );
    await captureStep(
      nvda,
      "quality-sponsor-fix",
      () => nvda.type("replacement@example.invalid", { capture: true }),
      info,
    );
    await expect(email).toHaveValue("replacement@example.invalid");
    await captureStep(
      nvda,
      "quality-edit-cancel",
      () => passKeyToApplication(nvda, "Escape"),
      info,
    );
    await expect(
      page.getByTestId("admin-edit-quality-campaign-modal"),
    ).not.toBeVisible();
    await tabTo(nvda, "Supprimer la campagne", info);
    await expect(
      page.getByTestId("admin-quality-campaign-delete-btn"),
    ).toBeFocused();
    const confirmation = await activateCurrent(
      nvda,
      info,
      "quality-delete-confirmation",
    );
    expect(confirmation.text).toContain(
      normalizeSpeech("Supprimer la campagne"),
    );
    await tabTo(nvda, /^supprimer\b/, info);
    const confirm = page.getByTestId(
      "admin-quality-campaign-delete-confirm-btn",
    );
    await expect(confirm).toBeFocused();
    await activateCurrent(nvda, info, "quality-delete-start");
    await expect.poll(() => network.pending.length).toBe(1);
    const failure = await captureStep(
      nvda,
      "quality-delete-error",
      async () => {
        await nvda.capture(
          async () => {
            network.release("error");
            await expect(
              page.getByTestId("admin-delete-quality-campaign-modal"),
            ).toContainText("La campagne n’a pas été supprimée");
            await page.waitForTimeout(1200);
          },
          { capture: true },
        );
      },
      info,
    );
    expect(failure.text).toContain(
      normalizeSpeech("La campagne n’a pas été supprimée"),
    );
    await expect(confirm).toBeFocused();
    await activateCurrent(nvda, info, "quality-delete-retry");
    await expect.poll(() => network.pending.length).toBe(1);
    await captureStep(
      nvda,
      "quality-delete-success",
      async () => {
        await nvda.capture(
          async () => {
            network.release("success");
            await expect(
              page.getByTestId("admin-quality-campaign-delete-btn"),
            ).toHaveCount(0);
            await expect(
              page.getByTestId("admin-quality-campaigns-title"),
            ).toBeFocused();
          },
          { capture: true },
        );
      },
      info,
    );
    const completed = await captureStep(
      nvda,
      "quality-context-after-delete",
      () =>
        nvda.perform(nvda.keyboardCommands.reportCurrentFocus, {
          capture: true,
        }),
      info,
    );
    expect(completed.text).toContain(
      normalizeSpeech("Campagnes de mise en qualité"),
    );
    expect(network.unhandled).toEqual([]);
    await finishAdmin(page, network, info);
  } finally {
    network.cancelPending();
  }
});

test("AT-INT-U14-tokens — annulation, création échouée/réussie puis révocation", async ({
  page,
  browser,
  nvda,
}, info) => {
  const network = await adminNetwork(page);
  try {
    await page.goto(network.base);
    await mountAdminScene(page, "tokens");
    await attachIdentity(nvda, browser.version(), info);
    await focusDocumentStart(page, nvda);
    await tabTo(nvda, "Créer un token applicatif", info);
    await activateCurrent(nvda, info, "token-open-form");
    await expect(
      page.getByRole("radio", { name: /Au nom d’un utilisateur/ }),
    ).toBeFocused();
    const mode = await captureStep(
      nvda,
      "token-mode",
      () =>
        nvda.perform(nvda.keyboardCommands.reportCurrentFocus, {
          capture: true,
        }),
      info,
    );
    expect(mode.text).toContain(normalizeSpeech("Au nom d’un utilisateur"));
    expect(mode.text).toMatch(/coche|selectionne/);
    await tabTo(nvda, "Annuler", info);
    await activateCurrent(nvda, info, "token-cancel-form");
    await expect(page.getByTestId("admin-token-create-btn")).toBeFocused();
    await activateCurrent(nvda, info, "token-reopen-form");
    // La date est une donnée du montage. Ce scénario ne qualifie pas le calendrier natif.
    await page.locator("form input[type=date]").evaluate((element) => {
      const input = element as HTMLInputElement;
      input.value = "2027-01-01";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await info.attach("token-date-setup", {
      body: JSON.stringify({
        date: "2027-01-01",
        method: "synthetic fixture input event; no focus change",
        nativeCalendarTested: false,
      }),
      contentType: "application/json",
    });
    await tabTo(nvda, /\bnom\b.*edition|edition.*\bnom\b/, info);
    await expect(page.getByRole("textbox", { name: /^Nom/ })).toBeFocused();
    await captureStep(
      nvda,
      "token-name-select-all",
      () => nvda.press("Control+a", { capture: true }),
      info,
    );
    await captureStep(
      nvda,
      "token-name",
      () => nvda.type("Service QA", { capture: true }),
      info,
    );
    await tabTo(nvda, "Description", info);
    await expect(
      page.getByRole("textbox", { name: /^Description/ }),
    ).toBeFocused();
    await captureStep(
      nvda,
      "token-description-select-all",
      () => nvda.press("Control+a", { capture: true }),
      info,
    );
    await captureStep(
      nvda,
      "token-description",
      () => nvda.type("Description QA", { capture: true }),
      info,
    );
    await tabTo(nvda, "Créer le token", info);
    const submit = page.getByRole("button", {
      name: "Créer le token",
      exact: true,
    });
    await expect(submit).toBeFocused();
    const waiting = await activateCurrent(nvda, info, "token-create-start");
    await expect.poll(() => network.pending.length).toBe(1);
    await expect(submit).toHaveAttribute("aria-disabled", "true");
    await expect(submit).toBeFocused();
    expect(waiting.text).toContain(
      normalizeSpeech("Opération sur le token en cours"),
    );
    await activateCurrent(nvda, info, "token-duplicate-blocked");
    expect(network.pending).toHaveLength(1);
    const failure = await captureStep(
      nvda,
      "token-create-error",
      async () => {
        await nvda.capture(
          async () => {
            network.release("error");
            await expect(page.locator("#at-live-scene")).toContainText(
              "Erreur U14 fictive",
            );
            await page.waitForTimeout(1200);
          },
          { capture: true },
        );
      },
      info,
    );
    expect(failure.text).toMatch(/\berreur u\s?14 fictive\b/);
    await expect(submit).toBeFocused();
    await expect(page.getByRole("textbox", { name: /^Nom/ })).toHaveValue(
      "Service QA",
    );
    await expect(
      page.getByRole("textbox", { name: /^Description/ }),
    ).toHaveValue("Description QA");
    await activateCurrent(nvda, info, "token-create-retry");
    await expect.poll(() => network.pending.length).toBe(1);
    const success = await captureStep(
      nvda,
      "token-create-success",
      async () => {
        await nvda.capture(
          async () => {
            network.release("success");
            await expect(
              page.getByTestId("admin-token-copy-btn"),
            ).toBeFocused();
            await page.waitForTimeout(1200);
          },
          { capture: true },
        );
      },
      info,
    );
    expect(success.text).toContain(
      normalizeSpeech("Token applicatif créé avec succès"),
    );
    const copy = await captureStep(
      nvda,
      "token-copy-command",
      () =>
        nvda.perform(nvda.keyboardCommands.reportCurrentFocus, {
          capture: true,
        }),
      info,
    );
    expect(copy.text).toContain(normalizeSpeech("Copier"));
    expect(copy.text).toContain("bouton");
    // Ne pas activer Copier : aucun secret, même synthétique, n’est placé dans le presse-papier.
    await tabTo(nvda, "Révoquer", info);
    await expect(
      page
        .getByTestId("admin-service-tokens-table")
        .getByRole("button", { name: "Révoquer", exact: true }),
    ).toBeFocused();
    const revoke = await activateCurrent(nvda, info, "token-revoke-open");
    expect(revoke.text).toContain(normalizeSpeech("Confirmer la révocation"));
    await tabTo(nvda, /^revoquer\b/, info);
    await expect(
      page
        .getByRole("dialog")
        .getByRole("button", { name: "Révoquer", exact: true }),
    ).toBeFocused();
    await activateCurrent(nvda, info, "token-revoke-start");
    await expect.poll(() => network.pending.length).toBe(1);
    const revoked = await captureStep(
      nvda,
      "token-revoke-success",
      async () => {
        await nvda.capture(
          async () => {
            network.release("success");
            await expect(page.getByTestId("admin-tokens-title")).toBeFocused();
            await page.waitForTimeout(1200);
          },
          { capture: true },
        );
      },
      info,
    );
    expect(revoked.text).toContain(
      normalizeSpeech("Token révoqué avec succès"),
    );
    expect(network.unhandled).toEqual([]);
    await finishAdmin(page, network, info);
  } finally {
    network.cancelPending();
  }
});

test("AT-INT-U14-correlations — détection en erreur puis confirmation et réessai de revue", async ({
  page,
  browser,
  nvda,
}, info) => {
  const network = await adminNetwork(page);
  try {
    await page.goto(network.base);
    await mountAdminScene(page, "correlations");
    await attachIdentity(nvda, browser.version(), info);
    await focusDocumentStart(page, nvda);
    await tabTo(nvda, "Lancer la détection", info);
    const run = page.getByTestId("run-detection-button");
    await expect(run).toBeFocused();
    await activateCurrent(nvda, info, "correlation-detection-start");
    await expect.poll(() => network.pending.length).toBe(1);
    await expect(run).toHaveAttribute("aria-disabled", "true");
    await expect(run).toBeFocused();
    const busy = await captureStep(
      nvda,
      "correlation-detection-current",
      () =>
        nvda.perform(nvda.keyboardCommands.reportCurrentFocus, {
          capture: true,
        }),
      info,
    );
    expect(busy.text).toContain(normalizeSpeech("Détection en cours"));
    expect(busy.text).toMatch(
      /indisponible|non disponible|desactive|unavailable/,
    );
    await activateCurrent(
      nvda,
      info,
      "correlation-detection-duplicate-blocked",
    );
    expect(network.pending).toHaveLength(1);
    const detectionError = await captureStep(
      nvda,
      "correlation-detection-error",
      async () => {
        await nvda.capture(
          async () => {
            network.release("error");
            await expect(page.getByTestId("app-toaster")).toContainText(
              "Erreur lors du lancement de la détection.",
            );
            await page.waitForTimeout(1200);
          },
          { capture: true },
        );
      },
      info,
    );
    expect(detectionError.text).toContain(
      normalizeSpeech("Erreur lors du lancement de la détection"),
    );
    await expect(run).toBeFocused();
    await tabTo(nvda, /^accepter\b/, info);
    const accept = page.locator("[data-testid^=accept-suggestion]").first();
    await expect(accept).toBeFocused();
    const confirmation = await activateCurrent(
      nvda,
      info,
      "correlation-accept-confirmation",
    );
    expect(confirmation.text).toContain(
      normalizeSpeech("Accepter la suggestion de corrélation"),
    );
    await tabTo(nvda, "Confirmer", info);
    await expect(page.getByTestId("correlation-confirm-btn")).toBeFocused();
    await activateCurrent(nvda, info, "correlation-accept-start");
    await expect.poll(() => network.pending.length).toBe(1);
    const acceptError = await captureStep(
      nvda,
      "correlation-accept-error",
      async () => {
        await nvda.capture(
          async () => {
            network.release("error");
            await expect(page.getByTestId("app-toaster")).toContainText(
              "Erreur lors de l'acceptation de la suggestion.",
            );
            await expect(accept).toBeFocused();
            await page.waitForTimeout(1200);
          },
          { capture: true },
        );
      },
      info,
    );
    expect(acceptError.text).toContain(
      normalizeSpeech("Erreur lors de l'acceptation de la suggestion"),
    );
    const returned = await captureStep(
      nvda,
      "correlation-accept-retry-command",
      () =>
        nvda.perform(nvda.keyboardCommands.reportCurrentFocus, {
          capture: true,
        }),
      info,
    );
    expect(returned.text).toContain(normalizeSpeech("Accepter"));
    await activateCurrent(nvda, info, "correlation-accept-retry-open");
    await tabTo(nvda, "Confirmer", info);
    await activateCurrent(nvda, info, "correlation-accept-retry-submit");
    await expect.poll(() => network.pending.length).toBe(1);
    const success = await captureStep(
      nvda,
      "correlation-accept-success",
      async () => {
        await nvda.capture(
          async () => {
            network.release("success");
            await expect(
              page.getByTestId("admin-correlations-title"),
            ).toBeFocused();
            await expect(
              page.locator("[data-testid^=accept-suggestion]"),
            ).toHaveCount(0);
            await page.waitForTimeout(1200);
          },
          { capture: true },
        );
      },
      info,
    );
    expect(success.text).toContain(normalizeSpeech("Suggestion acceptée"));
    expect(network.unhandled).toEqual([]);
    await finishAdmin(page, network, info);
  } finally {
    network.cancelPending();
  }
});
