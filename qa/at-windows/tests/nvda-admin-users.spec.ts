import {
  expect,
  type Page,
  type TestInfo,
  type Locator,
} from "@playwright/test";
import type { NVDAPlaywright } from "@guidepup/playwright";
import {
  test,
  attachIdentity,
  captureStep,
  focusDocumentStart,
  normalizeSpeech,
} from "./fixture.js";
import { tabTo, shiftTabTo, activateCurrent } from "./native-utils.js";
import { setupU13, finishU13 } from "./admin-users-interactive-utils.js";
test.use({ serviceWorkers: "block" });
test.beforeEach(async ({}, info) => {
  info.setTimeout(420_000);
  info.annotations.push({
    type: "RGAA",
    description:
      "7.1.2 — U13 actions d’administration, refus synthétiques et focus ; aucun compte réel modifié",
  });
});
async function ready(
  page: Page,
  nvda: NVDAPlaywright,
  version: string,
  info: TestInfo,
  kind: "user" | "actor",
) {
  const network = await setupU13(page, kind);
  await attachIdentity(nvda, version, info);
  await focusDocumentStart(page, nvda);
  return network;
}
async function refuse(
  nvda: NVDAPlaywright,
  page: Page,
  info: TestInfo,
  button: Locator,
  alert: Locator,
  text: string,
) {
  await expect(button).toBeFocused();
  const spoken = await captureStep(
    nvda,
    "refused-command-local-error",
    async () => {
      await nvda.press("Enter", { capture: true });
      await nvda.capture(
        async () => {
          await expect(alert).toContainText(text);
          await page.waitForTimeout(1200);
        },
        { capture: true },
      );
    },
    info,
  );
  expect(spoken.text).toContain(normalizeSpeech(text));
  await expect(button).toBeFocused();
}
test("AT-U13-UserBlock — dialogue, refus annoncé, Annuler puis réessai réussi", async ({
  page,
  browser,
  nvda,
}, info) => {
  const n = await ready(page, nvda, browser.version(), info, "user");
  await tabTo(nvda, "Bloquer l'accès de cet utilisateur", info);
  const opening = await activateCurrent(nvda, info, "user-block-open");
  expect(opening.text).toMatch(/dialogue|dialog/);
  const d = page.getByRole("dialog", {
    name: "Bloquer l'accès de l'utilisateur",
    exact: true,
  });
  const button = d.getByTestId("admin-block-user-confirm-btn");
  await tabTo(nvda, "Bloquer l’accès de cet utilisateur", info);
  await refuse(
    nvda,
    page,
    info,
    button,
    d.getByTestId("user-block-error"),
    "Refus serveur synthétique",
  );
  await shiftTabTo(nvda, "Annuler", info);
  await activateCurrent(nvda, info, "user-block-cancel");
  await expect(d).not.toBeVisible();
  await expect(page.getByTestId("admin-user-block-btn")).toBeFocused();
  await activateCurrent(nvda, info, "user-block-reopen");
  await tabTo(nvda, "Bloquer l’accès de cet utilisateur", info);
  n.state.mode = "success";
  const success = await captureStep(
    nvda,
    "user-block-success",
    async () => {
      await nvda.press("Enter", { capture: true });
      await nvda.capture(
        async () => {
          await expect(d).not.toBeVisible();
          await page.waitForTimeout(1200);
        },
        { capture: true },
      );
    },
    info,
  );
  expect(success.text).toContain("acces de l utilisateur bloque");
  await expect(page.getByTestId("admin-user-block-btn")).toHaveAccessibleName(
    "Débloquer l'accès de cet utilisateur",
  );
  await expect(page.getByTestId("admin-user-block-btn")).toBeFocused();
  await finishU13(page, n, info);
});
test("AT-U13-Impersonation — refus annoncé et même commande disponible pour réessayer", async ({
  page,
  browser,
  nvda,
}, info) => {
  const n = await ready(page, nvda, browser.version(), info, "user");
  const b = page.getByTestId("admin-user-impersonate-btn");
  await tabTo(nvda, "Se connecter en tant que cet utilisateur", info);
  await refuse(
    nvda,
    page,
    info,
    b,
    page.getByTestId("app-toaster"),
    "Impossible d'impersonner cet utilisateur",
  );
  await expect(b).toHaveAttribute("aria-busy", "false");
  expect(
    n.u13Calls.filter((c) => c.path.endsWith("/impersonate")),
  ).toHaveLength(1);
  await finishU13(page, n, info);
});
for (const all of [false, true])
  test(`AT-U13-ActorDelete${all ? "All" : "One"} — refus local, sélection conservée et Annuler`, async ({
    page,
    browser,
    nvda,
  }, info) => {
    const n = await ready(page, nvda, browser.version(), info, "actor");
    const opener = page.getByTestId(
      all ? "admin-actor-delete-all-btn" : "admin-actor-delete-btn",
    );
    await tabTo(
      nvda,
      all ? "Supprimer par email" : "Supprimer cet acteur",
      info,
    );
    const opening = await activateCurrent(
      nvda,
      info,
      "admin-actor-delete-open",
    );
    expect(opening.text).toMatch(/dialogue|dialog/);
    const d = page.getByRole("dialog", {
      name: all ? "Supprimer les acteurs par email" : "Supprimer cet acteur",
      exact: true,
    });
    const button = d.getByTestId(
      all
        ? "admin-actor-delete-all-confirm-btn"
        : "admin-actor-delete-confirm-btn",
    );
    await tabTo(nvda, /^supprimer.*bouton/, info);
    await refuse(
      nvda,
      page,
      info,
      button,
      d.getByTestId(
        all ? "admin-actor-delete-all-error" : "admin-actor-delete-error",
      ),
      "Erreur lors de la suppression",
    );
    await expect(button).toBeEnabled();
    await shiftTabTo(nvda, "Annuler", info);
    await activateCurrent(nvda, info, "admin-actor-delete-cancel");
    await expect(d).not.toBeVisible();
    await expect(opener).toBeFocused();
    expect(n.u13Calls.filter((c) => c.method === "DELETE")).toHaveLength(1);
    await finishU13(page, n, info);
  });
test("AT-U13-ActorMaia — refus dans le dialogue, saisies et commande préservées", async ({
  page,
  browser,
  nvda,
}, info) => {
  const n = await ready(page, nvda, browser.version(), info, "actor");
  await tabTo(nvda, "Modifier par email", info);
  await activateCurrent(nvda, info, "admin-actor-all-open");
  const d = page.getByRole("dialog", {
    name: "Modifier les acteurs par email",
    exact: true,
  });
  const button = d.getByTestId("admin-actor-all-sync-maia-btn");
  await tabTo(nvda, "Synchroniser depuis MAIA", info);
  await refuse(
    nvda,
    page,
    info,
    button,
    d.getByTestId("admin-actor-all-error"),
    "Erreur lors de la synchronisation MAIA",
  );
  await expect(d.getByTestId("admin-actor-all-lastname-input")).toHaveValue(
    "Fictif",
  );
  await finishU13(page, n, info);
});
test("AT-U13-ActorLookup — chargement refusé, erreur restituée et suppression indisponible", async ({
  page,
  browser,
  nvda,
}, info) => {
  const n = await ready(page, nvda, browser.version(), info, "actor");
  n.state.lookup = "error";
  await tabTo(nvda, "Supprimer par email", info);
  await activateCurrent(nvda, info, "admin-actor-lookup-error-open");
  const d = page.getByRole("dialog", {
    name: "Supprimer les acteurs par email",
    exact: true,
  });
  await expect(d.getByTestId("admin-actor-delete-all-error")).toContainText(
    "Impossible de charger",
  );
  await expect(
    d.getByTestId("admin-actor-delete-all-confirm-btn"),
  ).toBeDisabled();
  await focusDocumentStart(page, nvda);
  const read = await captureStep(
    nvda,
    "admin-actor-lookup-error-reading",
    () => nvda.perform(nvda.keyboardCommands.sayAll, { capture: true }),
    info,
  );
  expect(read.text).toContain(
    "impossible de charger les applications concernees",
  );
  await captureStep(
    nvda,
    "admin-actor-lookup-close",
    () => nvda.press("Escape", { capture: true }),
    info,
  );
  await expect(d).not.toBeVisible();
  await expect(page.getByTestId("admin-actor-delete-all-btn")).toBeFocused();
  await finishU13(page, n, info);
});
