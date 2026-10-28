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
  finishLastFamilies,
  helpVariants,
  lastFamiliesNetwork,
  mountLastActors,
  mountLastApp,
  mountLastHelp,
  refreshRealUser,
  renewRealOidc,
  tooltipDescription,
  tooltipName,
} from "./last-families-interactive-utils.js";

test.use({ serviceWorkers: "block" });
test.beforeEach(async ({}, info) => {
  info.setTimeout(900_000);
  info.annotations.push({
    type: "RGAA",
    description:
      "7.1.2 — U20/U22/U23 : vrais composants, session/API synthétiques ; restitution native à constater sur Windows, aucune clôture déduite de la prévalidation DOM",
  });
});

// captureStep expects Promise<void>; discard only the SDK Capture return value,
// while the actual Remote speak events remain in its native log and attachments.
async function captureExternal(
  nvda: NVDAPlaywright,
  action: () => Promise<void>,
  options: { capture: true },
) {
  await nvda.capture(action, options);
}

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

// Only reads disambiguate the DOM target. Native Tab moves the focus and native
// NVDA speak events provide every asserted name; no locator.focus or DOM speech.
async function reachControl(
  nvda: NVDAPlaywright,
  target: Locator,
  name: string,
  info: TestInfo,
) {
  await expect(target).toBeVisible();
  const direction = await target.evaluate((element) =>
    document.activeElement &&
    element.compareDocumentPosition(document.activeElement) &
      Node.DOCUMENT_POSITION_FOLLOWING
      ? ("Shift+Tab" as const)
      : ("Tab" as const),
  );
  const matches = () =>
    target.evaluate(
      (element) =>
        element === document.activeElement ||
        element.contains(document.activeElement),
    );
  let arrival: Awaited<ReturnType<typeof captureStep>> | undefined;
  const visited: string[] = [];
  for (let index = 0; index <= 80; index++) {
    if (await matches()) {
      if (!arrival) {
        arrival = await captureStep(
          nvda,
          "last-family-rejoin-current-tab",
          async () => {
            await nvda.press(direction === "Tab" ? "Shift+Tab" : "Tab", {
              capture: true,
            });
            await nvda.press(direction, { capture: true });
          },
          info,
        );
        await expect.poll(matches).toBe(true);
      }
      const focus = await currentFocus(
        nvda,
        info,
        `last-family-current-${index}`,
      );
      const phrases = [...arrival.phrases, ...focus.phrases];
      const result = { phrases, text: normalizeSpeech(phrases.join(" ")) };
      expect(result.text).toContain(normalizeSpeech(name));
      return result;
    }
    arrival = await captureStep(
      nvda,
      `last-family-${direction}-${index}`,
      () => nvda.press(direction, { capture: true }),
      info,
    );
    visited.push(arrival.text);
  }
  throw new Error(
    `Commande non atteinte par le clavier natif : ${name}. Annonces : ${JSON.stringify(visited)}`,
  );
}

test("AT-LAST-U20 — renouvellement réel pendant un brouillon, écran de reconnexion et accès bloqué", async ({
  page,
  browser,
  nvda,
}, info) => {
  const network = await lastFamiliesNetwork(page);
  // The real OIDC redirect failure calls window.stop(). Vite's development
  // client otherwise reloads this immutable scene when its socket closes,
  // even with server.hmr:false. Disable only that local developer connection.
  const developerOrigin = new URL(network.base).origin.replace(/^http/, "ws");
  await page.routeWebSocket(
    (url) =>
      url.origin === developerOrigin &&
      url.pathname === "/" &&
      url.searchParams.has("token"),
    (socket) =>
      socket.close({
        code: 1000,
        reason: "Immutable AT scene: developer HMR disabled",
      }),
  );
  network.lastState.discovery = "ok";
  await page.goto(network.base);
  await mountLastApp(page, "/profil");
  await attachIdentity(nvda, browser.version(), info);
  await focusDocumentStart(page, nvda);
  await reachControl(
    nvda,
    page.getByRole("tab", { name: "Mes informations", exact: true }),
    "Mes informations",
    info,
  );
  const tokens = await captureStep(
    nvda,
    "auth-tokens-native-arrow",
    () => nvda.press("ArrowRight", { capture: true }),
    info,
  );
  await expect(
    page.getByRole("tab", { name: "Mes tokens", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  expect(
    tokens.text + (await currentFocus(nvda, info, "auth-tokens-current")).text,
  ).toContain("mes tokens");
  await reachControl(
    nvda,
    page.getByTestId("token-create-btn"),
    "Créer un nouveau token",
    info,
  );
  await activateCurrent(nvda, info, "auth-token-form-open");
  const name = page.locator("#token-name");
  await expect(name).toBeFocused();
  const field = await reachControl(nvda, name, "Nom", info);
  expect(field.text).toMatch(/edition|texte/);
  await captureStep(
    nvda,
    "auth-token-draft-native-input",
    () => nvda.type("Brouillon fictif conserve", { capture: true }),
    info,
  );
  const original = await name.elementHandle();
  expect(original).toBeTruthy();
  await captureStep(
    nvda,
    "auth-real-oidc-silent-renew",
    () =>
      captureExternal(
        nvda,
        async () => {
          const renewed = await renewRealOidc(page);
          expect(renewed.tokenIsControlledFixture).toBe(true);
          await expect.poll(() => network.lastState.renewalCount).toBe(1);
          await expect(name).toHaveValue("Brouillon fictif conserve");
          await expect(name).toBeFocused();
          await expect(page.getByTestId("access-verification")).toHaveCount(0);
        },
        { capture: true },
      ),
    info,
  );
  expect(
    await original?.evaluate(
      (element) => element.isConnected && element === document.activeElement,
    ),
  ).toBe(true);
  const kept = await currentFocus(nvda, info, "auth-draft-focus-after-renew");
  expect(kept.text).toContain("brouillon fictif conserve");
  expect(kept.text).toMatch(/edition|texte/);

  // A fresh document deliberately gives the real OIDC manager uncached metadata.
  // No real provider, account, auth policy or application handler is changed.
  network.lastState.discovery = "error";
  await page.goto(network.base);
  await mountLastApp(page, "/profil");
  await focusDocumentStart(page, nvda);
  const weak = await captureStep(
    nvda,
    "auth-real-403-downgrade",
    () =>
      captureExternal(
        nvda,
        async () => {
          network.lastState.me = "weak";
          await refreshRealUser(page);
          await expect(page.getByTestId("weak-auth-banner")).toBeVisible();
          await expect(
            page
              .getByTestId("weak-auth-banner")
              .getByRole("heading", { level: 1 }),
          ).toBeFocused();
        },
        { capture: true },
      ),
    info,
  );
  expect(weak.text).toContain("authentification forte requise");
  const retry = page.getByTestId("weak-auth-reauth-btn");
  const retrySpeech = await reachControl(nvda, retry, "Se reconnecter", info);
  expect(retrySpeech.text).toContain("bouton");
  const pressed = await activateCurrent(
    nvda,
    info,
    "auth-reauth-native-activate",
  );
  const failed = await captureStep(
    nvda,
    "auth-late-discovery-503",
    () =>
      captureExternal(
        nvda,
        async () => {
          await expect(
            page.getByTestId("weak-auth-banner").getByRole("alert"),
          ).toContainText("La redirection vers le fournisseur");
          await expect(retry).toBeEnabled();
          await expect(retry).toBeFocused();
        },
        { capture: true },
      ),
    info,
  );
  expect(pressed.text + failed.text).toContain(
    "la redirection vers le fournisseur",
  );
  const retryFocus = await currentFocus(
    nvda,
    info,
    "auth-reauth-focus-after-error",
  );
  expect(retryFocus.text).toContain("se reconnecter");
  expect(retryFocus.text).toContain("bouton");

  // The existing blocked-access screen has no cancel action. Escape preserves
  // its blocking message and its only logout command; logout is not activated.
  network.lastState.me = "strong";
  await page.goto(network.base);
  await mountLastApp(page, "/profil");
  await focusDocumentStart(page, nvda);
  const blocked = page.getByRole("alertdialog", {
    name: "Votre accès a été bloqué",
    exact: true,
  });
  const shown = await captureStep(
    nvda,
    "auth-real-blocked-access-403",
    () =>
      captureExternal(
        nvda,
        async () => {
          network.lastState.me = "blocked";
          await refreshRealUser(page);
          await expect(blocked).toBeVisible();
          await expect(
            blocked.getByTestId("blocked-access-logout-btn"),
          ).toBeFocused();
        },
        { capture: true },
      ),
    info,
  );
  expect(shown.text).toContain("votre acces a ete bloque");
  expect(shown.text).toMatch(/dialogue|dialog|alerte/);
  await captureStep(
    nvda,
    "auth-blocked-escape",
    () => nvda.press("Escape", { capture: true }),
    info,
  );
  await expect(blocked).toBeVisible();
  const logout = blocked.getByTestId("blocked-access-logout-btn");
  for (const key of ["Tab", "Shift+Tab"]) {
    await captureStep(
      nvda,
      `auth-blocked-${key}`,
      () => nvda.press(key, { capture: true }),
      info,
    );
    await expect(logout).toBeFocused();
    const focus = await currentFocus(nvda, info, `auth-blocked-current-${key}`);
    expect(focus.text).toContain("se deconnecter");
    expect(focus.text).toContain("bouton");
  }
  await finishLastFamilies(page, network, info);
});

test("AT-LAST-U22 — aides réelles acteurs, suggestions et tags ouvertes et fermées au clavier", async ({
  page,
  browser,
  nvda,
}, info) => {
  const network = await lastFamiliesNetwork(page);
  await page.goto(network.base);
  await attachIdentity(nvda, browser.version(), info);
  const variants = [
    {
      id: "admin-actors",
      mount: () => mountLastActors(page),
      name: tooltipName,
      description: tooltipDescription,
    },
    {
      id: "application-actors",
      mount: () => mountLastActors(page, false),
      name: tooltipName,
      description: tooltipDescription,
    },
    ...helpVariants.map((variant) => ({
      ...variant,
      mount: () => mountLastHelp(page, variant),
    })),
  ];
  for (const variant of variants) {
    await variant.mount();
    await focusDocumentStart(page, nvda);
    const trigger = page.getByRole("button", {
      name: variant.name,
      exact: true,
    });
    const id = await trigger.getAttribute("aria-describedby");
    expect(id).toBeTruthy();
    const tooltip = page.locator("[id=" + JSON.stringify(id) + "]");
    const arrival = await reachControl(nvda, trigger, variant.name, info);
    expect(arrival.text).toContain("bouton");
    const opened = await activateCurrent(nvda, info, `${variant.id}-help-open`);
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText(variant.description);
    const named = await currentFocus(nvda, info, `${variant.id}-help-current`);
    expect(arrival.text + opened.text + named.text).toContain(
      normalizeSpeech(variant.description),
    );
    await captureStep(
      nvda,
      `${variant.id}-help-escape`,
      () => nvda.press("Escape", { capture: true }),
      info,
    );
    await expect(tooltip).not.toBeVisible();
    await expect(trigger).toBeFocused();
    const kept = await currentFocus(
      nvda,
      info,
      `${variant.id}-help-focus-kept`,
    );
    expect(kept.text).toContain(normalizeSpeech(variant.name));
    await captureStep(
      nvda,
      `${variant.id}-help-space`,
      () => nvda.press("Space", { capture: true }),
      info,
    );
    await expect(tooltip).toBeVisible();
    await captureStep(
      nvda,
      `${variant.id}-help-space-close`,
      () => nvda.press("Escape", { capture: true }),
      info,
    );
    await expect(tooltip).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await captureStep(
      nvda,
      `${variant.id}-help-continue`,
      () => nvda.press("Tab", { capture: true }),
      info,
    );
    await expect(trigger).not.toBeFocused();
  }
  await finishLastFamilies(page, network, info);
});

test("AT-LAST-U23 — technologies, filtres, pagination, lien et dialogue sans sauvegarde", async ({
  page,
  browser,
  nvda,
}, info) => {
  const network = await lastFamiliesNetwork(page);
  await page.goto(network.base);
  await mountLastApp(page, "/technologies");
  await expect(page.getByTestId("end-of-life-status")).toContainText(
    "Résultat 1 à 15 sur 18",
  );
  await attachIdentity(nvda, browser.version(), info);
  await focusDocumentStart(page, nvda);
  const organization = page.getByRole("textbox", {
    name: "Organisation",
    exact: true,
  });
  const orgSpeech = await reachControl(
    nvda,
    organization,
    "Organisation",
    info,
  );
  expect(orgSpeech.text).toMatch(/edition|texte/);
  const filteredInput = await captureStep(
    nvda,
    "eol-organization-native-input",
    () => nvda.type("Nord", { capture: true }),
    info,
  );
  const filtered = await captureStep(
    nvda,
    "eol-organization-late-response",
    () =>
      captureExternal(
        nvda,
        async () => {
          await expect(page.getByTestId("end-of-life-status")).toContainText(
            "Résultat 1 à 9 sur 9",
          );
        },
        { capture: true },
      ),
    info,
  );
  expect(`${filteredInput.text} ${filtered.text}`).toMatch(
    /resultat\s*1\s*a\s*9\s*sur\s*9/,
  );
  const search = page.getByRole("textbox", { name: "Recherche", exact: true });
  await reachControl(nvda, search, "Recherche", info);
  const emptyInput = await captureStep(
    nvda,
    "eol-empty-native-query",
    () => nvda.type("introuvable", { capture: true }),
    info,
  );
  const empty = await captureStep(
    nvda,
    "eol-empty-late-response",
    () =>
      captureExternal(
        nvda,
        async () => {
          await expect(page.getByTestId("end-of-life-empty")).toBeVisible();
        },
        { capture: true },
      ),
    info,
  );
  expect(`${emptyInput.text} ${empty.text}`).toContain(
    "aucune application concernee",
  );
  const clear = page.getByTestId("end-of-life-clear-filters");
  await reachControl(nvda, clear, "Effacer les filtres", info);
  const clearInput = await activateCurrent(
    nvda,
    info,
    "eol-clear-native-activate",
  );
  const restored = await captureStep(
    nvda,
    "eol-clear-late-response",
    () =>
      captureExternal(
        nvda,
        async () => {
          await expect(page.getByTestId("end-of-life-status")).toContainText(
            "Résultat 1 à 15 sur 18",
          );
          await expect(clear).toBeFocused();
        },
        { capture: true },
      ),
    info,
  );
  expect(`${clearInput.text} ${restored.text}`).toMatch(
    /resultat\s*1\s*a\s*15\s*sur\s*18/,
  );
  expect(
    (await currentFocus(nvda, info, "eol-clear-focus-after-load")).text,
  ).toContain("effacer les filtres");
  const next = page.getByTestId("pagination-next");
  await reachControl(nvda, next, "Page suivante", info);
  const nextInput = await activateCurrent(nvda, info, "eol-next-page-native");
  const nextPage = await captureStep(
    nvda,
    "eol-next-page-late-response",
    () =>
      captureExternal(
        nvda,
        async () => {
          await expect(page.getByTestId("end-of-life-status")).toContainText(
            "Résultat 16 à 18 sur 18",
          );
        },
        { capture: true },
      ),
    info,
  );
  expect(`${nextInput.text} ${nextPage.text}`).toMatch(
    /resultat\s*16\s*a\s*18\s*sur\s*18/,
  );
  await reachControl(
    nvda,
    page.getByTestId("pagination-first"),
    "Première page",
    info,
  );
  await activateCurrent(nvda, info, "eol-first-page-native");
  await captureStep(
    nvda,
    "eol-first-page-late-response",
    () =>
      captureExternal(
        nvda,
        async () => {
          await expect(page.getByTestId("end-of-life-status")).toContainText(
            "Résultat 1 à 15 sur 18",
          );
        },
        { capture: true },
      ),
    info,
  );
  const link = page.getByTestId("end-of-life-row-" + alpha + "-link");
  const linkSpeech = await reachControl(
    nvda,
    link,
    "Application fictive Alpha",
    info,
  );
  expect(linkSpeech.text).toContain("lien");
  await activateCurrent(nvda, info, "eol-real-technology-route");
  await captureStep(
    nvda,
    "eol-technology-route-settled",
    () =>
      captureExternal(
        nvda,
        async () => {
          await expect(page.getByTestId("technology-tab")).toBeVisible();
          await expect(
            page.getByTestId(
              "technology-eol-manual-aaaaaaaa-2222-4222-8222-aaaaaaaaaaaa",
            ),
          ).toContainText("saisie manuelle");
        },
        { capture: true },
      ),
    info,
  );
  const edit = page.getByTestId("technology-edit-btn");
  const editSpeech = await reachControl(
    nvda,
    edit,
    "Modifier la technologie",
    info,
  );
  expect(editSpeech.text).toContain("bouton");
  const opened = await activateCurrent(
    nvda,
    info,
    "eol-technology-native-open",
  );
  const modal = page.getByTestId("technology-modal");
  await expect(modal).toBeVisible();
  expect(opened.text).toMatch(
    /modifier la technologie|modifier une technologie|modifier technologie/,
  );
  expect(opened.text).toMatch(/dialogue|dialog/);
  await reachControl(
    nvda,
    modal.getByRole("button", { name: "Annuler", exact: true }),
    "Annuler",
    info,
  );
  await activateCurrent(nvda, info, "eol-technology-native-cancel");
  await expect(modal).not.toBeVisible();
  await expect(edit).toBeFocused();
  const returned = await currentFocus(
    nvda,
    info,
    "eol-technology-origin-restored",
  );
  expect(returned.text).toContain("modifier la technologie");
  expect(returned.text).toContain("bouton");
  await finishLastFamilies(page, network, info);
});
