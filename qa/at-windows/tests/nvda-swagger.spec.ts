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
  shiftTabTo,
  tabTo,
  passKeyToApplication,
} from "./native-utils.js";
import { installSyntheticSwagger } from "./exports-swagger-utils.js";

test.use({ serviceWorkers: "block" });
test.beforeEach(async ({}, info) => {
  info.setTimeout(420_000);
  info.annotations.push({
    type: "RGAA",
    description:
      "7.1.2 — U19/U21 ciblés, composants réels, données synthétiques ; aucun Execute/OAuth soumis et aucune clôture globale",
  });
});

test("AT-INT-U19-Authorize — noms/rôles, scopes, Close/Escape et retour", async ({
  page,
  browser,
  nvda,
}, info) => {
  const network = await installSyntheticSwagger(page);
  await attachIdentity(nvda, browser.version(), info);
  await focusDocumentStart(page, nvda);
  expect((await tabTo(nvda, "Authorize", info)).text).toContain("bouton");
  const opening = await activateCurrent(nvda, info, "swagger-authorize-open");
  const dialog = page.getByRole("dialog", { name: "Available authorizations" });
  await expect(dialog).toBeVisible();
  expect(opening.text).toContain("available authorizations");
  expect(opening.text).toMatch(/dialogue|dialog/);
  for (const field of [
    { name: /client\s*id/, id: "client_id_authorizationCode", secret: false },
    {
      name: /client\s*secret/,
      id: "client_secret_authorizationCode",
      secret: true,
    },
  ]) {
    const spoken = await tabTo(nvda, field.name, info);
    expect(spoken.text).toMatch(
      field.secret ? /protege|mot de passe|password/ : /edition|zone.*texte/,
    );
    await expect(page.locator(`[id="${field.id}"]`)).toBeFocused();
    await nvda.press("Control+a", { capture: true });
    await nvda.type(field.secret ? "not-a-real-secret" : "fictitious-client", {
      capture: false,
    });
    await expect(page.locator(`[id="${field.id}"]`)).toHaveValue(
      field.secret ? "not-a-real-secret" : "fictitious-client",
    );
  }
  for (const scope of ["openid", "profile"]) {
    const spoken = await tabTo(nvda, scope, info);
    expect(spoken.text).toMatch(/case.*cocher|checkbox/);
    const input = page.locator(
      `[id="${scope}-authorizationCode-checkbox-oauth2"]`,
    );
    // The product selects the declared OAuth scopes by default. Exercise both
    // real state transitions instead of assuming an initially empty selection.
    await expect(input).toBeChecked();
    await captureStep(
      nvda,
      `swagger-${scope}-uncheck`,
      () => nvda.press("Space", { capture: true }),
      info,
    );
    await expect(input).not.toBeChecked();
    const unchecked = await captureStep(
      nvda,
      `swagger-${scope}-unchecked-state`,
      () =>
        nvda.perform(nvda.keyboardCommands.reportCurrentFocus, {
          capture: true,
        }),
      info,
    );
    expect(unchecked.text).toContain(scope);
    expect(unchecked.text).toMatch(/non coche|not checked/);
    await captureStep(
      nvda,
      `swagger-${scope}-check`,
      () => nvda.press("Space", { capture: true }),
      info,
    );
    await expect(input).toBeChecked();
    const state = await captureStep(
      nvda,
      `swagger-${scope}-state`,
      () =>
        nvda.perform(nvda.keyboardCommands.reportCurrentFocus, {
          capture: true,
        }),
      info,
    );
    expect(state.text).toContain(scope);
    expect(state.text).toMatch(/coche|checked/);
  }
  const key = await tabTo(nvda, /^.*value.*edition|api\s*key.*edition/, info);
  expect(key.text).toMatch(/edition|zone.*texte/);
  await expect(page.locator("#api_key_value")).toBeFocused();
  // The internal Authorize buttons are never activated. No credential exchange.
  await tabTo(nvda, /^close\b|\bclose.*bouton/, info);
  await activateCurrent(nvda, info, "swagger-dialog-close");
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Authorize", exact: true }).first(),
  ).toBeFocused();
  const returned = await captureStep(
    nvda,
    "swagger-authorize-return",
    () =>
      nvda.perform(nvda.keyboardCommands.reportCurrentFocus, { capture: true }),
    info,
  );
  expect(returned.text).toContain("authorize");
  expect(returned.text).toContain("bouton");
  await activateCurrent(nvda, info, "swagger-authorize-reopen");
  await expect(dialog).toBeVisible();
  await captureStep(
    nvda,
    "swagger-authorize-escape",
    async () => {
      // NVDA consumes Escape to leave forms mode. Its documented pass-next-key
      // command sends this deliberate Escape to the web dialog itself.
      await passKeyToApplication(nvda, "Escape");
    },
    info,
  );
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Authorize", exact: true }).first(),
  ).toBeFocused();
  expect(network.forbidden).toEqual([]);
  await info.attach("swagger-exact-bundle-provenance", {
    body: Buffer.from(JSON.stringify(network.provenance, null, 2)),
    contentType: "application/json",
  });
});

test("AT-INT-U19-Operations — expansion GET/POST, paramètres/réponses et repli, lecture seule", async ({
  page,
  browser,
  nvda,
}, info) => {
  const network = await installSyntheticSwagger(page);
  await attachIdentity(nvda, browser.version(), info);
  await focusDocumentStart(page, nvda);
  await tabTo(nvda, /get.*applications.*id.*bouton/, info);
  const expansion = await activateCurrent(nvda, info, "swagger-get-expand");
  const operation = page
    .locator(".opblock")
    .filter({ hasText: "Lire une application fictive" });
  await expect(operation.locator(".opblock-summary-control")).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(operation.locator("table.parameters")).toBeVisible();
  expect(expansion.text).toMatch(/developpe|expanded|enfonce|appuye/);
  const table = await captureStep(
    nvda,
    "swagger-parameters-table-first-cell",
    async () => {
      await nvda.perform(nvda.keyboardCommands.moveToNextTable, {
        capture: true,
      });
    },
    info,
  );
  expect(table.text).toContain("name");
  const parameter = await captureStep(
    nvda,
    "swagger-parameter-row-and-column",
    async () => {
      await nvda.perform(nvda.keyboardCommands.moveToNextRow, {
        capture: true,
      });
      await nvda.perform(nvda.keyboardCommands.moveToNextColumn, {
        capture: true,
      });
    },
    info,
  );
  expect(parameter.text).not.toMatch(
    /pas dans une cellule|not in a table cell/,
  );
  expect(parameter.text).toContain("id");
  expect(parameter.text).toContain("description");
  expect(parameter.text).toContain("identifiant de l application fictive");
  const responses = await captureStep(
    nvda,
    "swagger-responses-headers-and-value",
    async () => {
      await nvda.perform(nvda.keyboardCommands.moveToNextTable, {
        capture: true,
      });
      await nvda.perform(nvda.keyboardCommands.moveToNextRow, {
        capture: true,
      });
      await nvda.perform(nvda.keyboardCommands.moveToNextColumn, {
        capture: true,
      });
    },
    info,
  );
  expect(responses.text).not.toMatch(
    /pas dans une cellule|not in a table cell/,
  );
  expect(responses.text).toContain("code");
  expect(responses.text).toContain("description");
  expect(responses.text).toContain("200");
  expect(responses.text).toContain("application fictive");
  await captureStep(
    nvda,
    "swagger-leave-table-for-controls",
    () => nvda.press("Shift+Tab", { capture: true }),
    info,
  );
  await shiftTabTo(nvda, /get.*applications.*id.*bouton/, info);
  await activateCurrent(nvda, info, "swagger-get-collapse");
  await expect(operation.locator(".opblock-summary-control")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await tabTo(nvda, /post.*applications.*bouton/, info);
  await activateCurrent(nvda, info, "swagger-post-expand-read-only");
  const post = page
    .locator(".opblock")
    .filter({ hasText: "Description d’une création fictive" });
  await expect(post.locator(".opblock-summary-control")).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(post.locator("table.responses-table")).toBeVisible();
  await captureStep(
    nvda,
    "swagger-post-refresh-native-buffer",
    () =>
      nvda.perform(nvda.keyboardCommands.refreshBrowseDocument, {
        capture: true,
      }),
    info,
  );
  await focusDocumentStart(page, nvda);
  const body = await captureStep(
    nvda,
    "swagger-post-request-body-heading",
    async () => {
      for (let heading = 0; heading < 10; heading++) {
        await nvda.perform(nvda.keyboardCommands.moveToNextHeading, {
          capture: true,
        });
        if (
          normalizeSpeech(await nvda.lastSpokenPhrase()).includes(
            "request body",
          )
        )
          break;
      }
    },
    info,
  );
  expect(body.text).toContain("request body");
  const postResponse = await captureStep(
    nvda,
    "swagger-post-response-table",
    async () => {
      await nvda.perform(nvda.keyboardCommands.moveToNextTable, {
        capture: true,
      });
      await nvda.perform(nvda.keyboardCommands.moveToNextRow, {
        capture: true,
      });
      await nvda.perform(nvda.keyboardCommands.moveToNextColumn, {
        capture: true,
      });
    },
    info,
  );
  expect(postResponse.text).not.toMatch(
    /pas dans une cellule|not in a table cell/,
  );
  expect(postResponse.text).toContain(
    "reponse fictive aucune execution autorisee",
  );
  expect(postResponse.text).toContain("201");
  await captureStep(
    nvda,
    "swagger-post-leave-table",
    () => nvda.press("Shift+Tab", { capture: true }),
    info,
  );
  await shiftTabTo(nvda, /post.*applications.*bouton/, info);
  await activateCurrent(nvda, info, "swagger-post-collapse");
  await expect(post.locator(".opblock-summary-control")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  expect(network.forbidden).toEqual([]);
});

test("AT-INT-U19-Editable — vrais paramètres et corps de requête, choix et annulation sans Execute", async ({
  page,
  browser,
  nvda,
}, info) => {
  const network = await installSyntheticSwagger(page);
  await attachIdentity(nvda, browser.version(), info);
  await focusDocumentStart(page, nvda);
  for (const method of ["get", "post"]) {
    const summaryName =
      method === "get"
        ? /get.*applications.*id.*bouton/
        : /post.*applications.*bouton/;
    await tabTo(nvda, summaryName, info);
    await activateCurrent(nvda, info, `swagger-editable-${method}-expand`);
    const operation = page.locator(`.opblock-${method}`);
    await tabTo(nvda, "Try it out", info);
    await activateCurrent(nvda, info, `swagger-editable-${method}-try`);
    await expect(
      operation.getByRole("button", { name: "Cancel", exact: true }),
    ).toBeFocused();
    if (method === "get") {
      const id = operation.locator('[data-param-name="id"] input');
      const idName = await tabTo(nvda, /^id\b.*(?:edition|texte)/, info);
      expect(idName.text).toContain("id");
      await expect(id).toBeFocused();
      await nvda.type("application-fictive-001", { capture: true });
      await expect(id).toHaveValue("application-fictive-001");
      const detail = operation.locator('[data-param-name="detail"] select');
      const detailName = await tabTo(nvda, "detail", info);
      expect(detailName.text).toMatch(/liste deroulante|combobox/);
      await expect(detail).toBeFocused();
      await captureStep(
        nvda,
        "swagger-native-detail-choice",
        async () => {
          await nvda.press("Home", { capture: true });
          await nvda.press("ArrowDown", { capture: true });
        },
        info,
      );
      await expect(detail).toHaveValue("true");
      const value = await captureStep(
        nvda,
        "swagger-detail-name-value",
        () =>
          nvda.perform(nvda.keyboardCommands.reportCurrentFocus, {
            capture: true,
          }),
        info,
      );
      expect(value.text).toContain("detail");
      expect(value.text).toContain("true");
    } else {
      const type = await tabTo(nvda, "Request content type", info);
      expect(type.text).toMatch(/liste deroulante|combobox/);
      const body = operation.locator(".body-param__text");
      const bodyName = await tabTo(
        nvda,
        /request body.*(?:edition|multiligne|texte)/,
        info,
      );
      expect(bodyName.text).toContain("request body");
      await expect(body).toBeFocused();
      await nvda.press("Control+a", { capture: true });
      // A JSON scalar exercises editing without VBScript string delimiters.
      // No request is executed, so the draft is deliberately not submitted.
      await nvda.type("123", { capture: true });
      await expect(body).toHaveValue("123");
    }
    await shiftTabTo(nvda, "Cancel", info);
    await activateCurrent(nvda, info, `swagger-editable-${method}-cancel`);
    await expect(
      operation.getByRole("button", { name: "Try it out", exact: true }),
    ).toBeFocused();
    await expect(
      operation.getByRole("button", { name: "Execute", exact: true }),
    ).toHaveCount(0);
    await shiftTabTo(nvda, summaryName, info);
    await activateCurrent(nvda, info, `swagger-editable-${method}-collapse`);
    await expect(operation.locator(".opblock-summary-control")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  }
  expect(network.forbidden).toEqual([]);
  await info.attach("swagger-editable-exact-provenance", {
    body: JSON.stringify(network.provenance, null, 2),
    contentType: "application/json",
  });
});
