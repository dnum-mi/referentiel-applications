import { expect } from "@playwright/test";
import {
  test,
  attachIdentity,
  captureStep,
  focusDocumentStart,
} from "./fixture.js";
import { mountProductionScene } from "./interactive-utils.js";
import { tabTo, shiftTabTo, activateCurrent } from "./native-utils.js";
import {
  mountFormsScene,
  simulatedFormsNetwork,
  finishForms,
} from "./forms-interactive-utils.js";

test.use({ serviceWorkers: "block" });
test.beforeEach(async ({}, info) => {
  info.setTimeout(300_000);
  info.annotations.push({
    type: "RGAA",
    description:
      "7.1.2 — trois parcours de composants réels ; aucune clôture des autres familles",
  });
});

test("AT-FORM-Markdown — neuf noms, trois fonctions, modes puis retour", async ({
  page,
  browser,
  nvda,
}, info) => {
  const network = await simulatedFormsNetwork(page);
  await page.goto(network.base);
  await mountFormsScene(page, "markdown");
  await attachIdentity(nvda, browser.version(), info);
  await focusDocumentStart(page, nvda);
  const editor = await tabTo(nvda, "Description", info);
  expect(editor.text).toMatch(/edition|multiligne|zone.*texte/);
  const actions = [
    "Gras",
    "Italique",
    /titre h\s*1/u,
    "Liste à puces",
    "Liste numérotée",
    "Code",
    "Citation",
    "Lien",
    "Tableau",
  ];
  for (const action of actions) {
    const role = await tabTo(nvda, action, info);
    expect(role.text).toContain("bouton");
  }
  await shiftTabTo(nvda, "Description", info);
  await nvda.press("Control+a", { capture: true });
  await nvda.type("Alpha", { capture: false });
  await nvda.press("Control+a", { capture: true });
  await tabTo(nvda, "Gras", info);
  await activateCurrent(nvda, info, "markdown-wrap-selection");
  const textarea = page.getByTestId("markdown-textarea");
  await expect(textarea).toHaveValue("**Alpha**");
  await expect(textarea).toBeFocused();
  const valueAfterWrap = await captureStep(
    nvda,
    "markdown-editor-after-wrap",
    () => nvda.perform(nvda.keyboardCommands.reportCurrentFocus),
    info,
  );
  expect(valueAfterWrap.text).toContain("description");
  expect(valueAfterWrap.text).toContain("alpha");
  await nvda.press("Control+a", { capture: true });
  await tabTo(nvda, "Liste à puces", info);
  await activateCurrent(nvda, info, "markdown-prefix-selection");
  await expect(textarea).toHaveValue("- **Alpha**");
  await expect(textarea).toBeFocused();
  await tabTo(nvda, "Tableau", info);
  await activateCurrent(nvda, info, "markdown-insert-at-cursor");
  await expect(textarea).toHaveValue(/Colonne 1/);
  await expect(textarea).toBeFocused();
  await shiftTabTo(nvda, "Visualiser l'aperçu", info);
  await activateCurrent(nvda, info, "markdown-preview-mode");
  await expect(page.getByTestId("markdown-tab-preview")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const previewState = await captureStep(
    nvda,
    "markdown-preview-pressed",
    () => nvda.perform(nvda.keyboardCommands.reportCurrentFocus),
    info,
  );
  expect(previewState.text).toMatch(/enfonce|appuye|presse/);
  await focusDocumentStart(page, nvda);
  const preview = await captureStep(
    nvda,
    "markdown-real-preview-table",
    async () => {
      await nvda.perform(nvda.keyboardCommands.moveToNextTable);
      await nvda.perform(nvda.keyboardCommands.moveToNextColumn);
    },
    info,
  );
  expect(preview.text).toContain("colonne");
  await captureStep(
    nvda,
    "leave-preview-table-for-mode-controls",
    () => nvda.press("Shift+Tab", { capture: true }),
    info,
  );
  await shiftTabTo(nvda, "Éditer le texte en format markdown", info);
  await activateCurrent(nvda, info, "markdown-return-edit-mode");
  await expect(page.getByTestId("markdown-tab-edit")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await tabTo(nvda, "Description", info);
  await expect(textarea).toHaveValue(/Alpha/);
  await nvda.press("Control+a", { capture: true });
  await nvda.type("- Alpha", { capture: true });
  await captureStep(
    nvda,
    "markdown-enter-continues-list",
    () => nvda.press("Enter", { capture: true }),
    info,
  );
  await expect(textarea).toHaveValue("- Alpha\n- ");
  await captureStep(
    nvda,
    "markdown-tab-leaves-editor",
    () => nvda.press("Tab", { capture: true }),
    info,
  );
  await expect(
    page.getByRole("button", { name: "Gras", exact: true }),
  ).toBeFocused();
  await captureStep(
    nvda,
    "markdown-shift-tab-returns-editor",
    () => nvda.press("Shift+Tab", { capture: true }),
    info,
  );
  await expect(textarea).toBeFocused();
  expect(network.formsCalls.some((call) => call.method !== "GET")).toBe(false);
  await finishForms(page, network, info);
});

test("AT-FORM-Report — vrai dialogue, erreur locale, POST500 puis succès simulés", async ({
  page,
  browser,
  nvda,
}, info) => {
  const network = await simulatedFormsNetwork(page);
  await page.goto(network.base);
  await mountFormsScene(page, "report");
  await attachIdentity(nvda, browser.version(), info);
  await focusDocumentStart(page, nvda);
  await tabTo(nvda, "Signaler une application manquante", info);
  const opening = await activateCurrent(nvda, info, "report-real-dialog-open");
  const dialog = page.getByRole("dialog", {
    name: "Signaler une application manquante",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  const opened = await captureStep(
    nvda,
    "report-dialog-name-and-close",
    () => nvda.perform(nvda.keyboardCommands.reportCurrentFocus),
    info,
  );
  expect(opening.text).toMatch(/dialogue|dialog/);
  expect(opening.text).toContain("signaler une application manquante");
  expect(opened.text).toMatch(/fermer.*bouton/);
  await tabTo(nvda, "Envoyer", info);
  const empty = await activateCurrent(nvda, info, "report-empty-validation");
  await expect(dialog.getByRole("alert")).toContainText(
    "Veuillez décrire votre signalement",
  );
  expect(empty.text).toContain("veuillez decrire votre signalement");
  await tabTo(nvda, "Décrivez l’application manquante", info);
  await nvda.type("Signalement fictif de test NVDA", { capture: false });
  await tabTo(nvda, "Envoyer", info);
  const error = await activateCurrent(nvda, info, "report-simulated-post-500");
  await expect(dialog.getByRole("alert")).toContainText(
    "Votre saisie est conservée",
  );
  expect(error.text).toContain("votre saisie est conservee");
  await expect(dialog.getByRole("textbox")).toHaveValue(
    "Signalement fictif de test NVDA",
  );
  await expect(dialog.getByTestId("report-submit-btn")).toBeFocused();
  network.formsState.reportMode = "success";
  const success = await activateCurrent(nvda, info, "report-simulated-success");
  await expect(dialog).not.toBeVisible();
  await expect(page.getByTestId("report-host-open")).toBeFocused();
  expect(success.text).toContain("merci pour votre signalement");
  expect(
    network.formsCalls.filter((call) => call.method === "POST"),
  ).toHaveLength(2);
  await finishForms(page, network, info);
});

test("AT-FORM-Notifications — panneau, deux rôles, vrai aperçu e-mail puis fermeture/état vide", async ({
  page,
  browser,
  nvda,
}, info) => {
  const network = await simulatedFormsNetwork(page);
  await page.goto(network.base);
  await mountFormsScene(page, "notifications");
  await attachIdentity(nvda, browser.version(), info);
  await focusDocumentStart(page, nvda);
  const trigger = await tabTo(nvda, /notifications.*bouton/, info);
  expect(trigger.text).toContain("bouton");
  expect(trigger.text).toContain("non lue");
  await activateCurrent(nvda, info, "notification-panel-open");
  const bell = page.getByTestId("notification-bell-button");
  await expect(bell).toHaveAttribute("aria-expanded", "true");
  const linked = await tabTo(nvda, "Signalement fictif pour Alpha", info);
  expect(linked.text).toContain("lien");
  expect(linked.text).toContain("non lue");
  const emailButton = await tabTo(nvda, "Courriel fictif de test", info);
  expect(emailButton.text).toContain("bouton");
  expect(emailButton.text).toContain("voir l");
  const opening = await activateCurrent(
    nvda,
    info,
    "notification-real-email-preview",
  );
  const dialog = page.getByRole("dialog", {
    name: "Courriel synthétique pour NVDA",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  const title = await captureStep(
    nvda,
    "notification-email-dialog",
    () => nvda.perform(nvda.keyboardCommands.reportCurrentFocus),
    info,
  );
  expect(opening.text).toContain("courriel synthetique pour nvda");
  expect(title.text).toMatch(/fermer.*bouton/);
  const email = await captureStep(
    nvda,
    "notification-sandboxed-iframe-content",
    async () => {
      await nvda.perform(nvda.keyboardCommands.moveToNextFrame);
      await nvda.perform(nvda.keyboardCommands.readLine);
    },
    info,
  );
  expect(email.text).toMatch(/contenu de l.*mail|courriel synthetique|fictifs/);
  await captureStep(
    nvda,
    "notification-email-close-escape",
    async () => {
      await nvda.perform(nvda.keyboardCommands.ignoreNextKeyCombination, {
        capture: true,
      });
      await nvda.press("Escape", { capture: true });
    },
    info,
  );
  await expect(dialog).not.toBeVisible();
  await expect(bell).toBeFocused();
  await expect(bell).toHaveAccessibleName("Notifications, 1 non lue");
  network.formsState.notificationMode = "empty";
  await page.evaluate(() => window.__rgaaFormsHost?.refreshNotifications());
  await tabTo(nvda, /notifications.*bouton/, info);
  await activateCurrent(nvda, info, "notification-empty-panel-open");
  await expect(
    page.getByTestId("notification-bell-panel").getByRole("status"),
  ).toContainText("Aucune notification");
  const empty = await captureStep(
    nvda,
    "notification-empty-native-reading",
    () => nvda.perform(nvda.keyboardCommands.sayAll),
    info,
  );
  expect(empty.text).toContain("aucune notification");
  await captureStep(
    nvda,
    "notification-panel-close-escape",
    async () => {
      await nvda.perform(nvda.keyboardCommands.ignoreNextKeyCombination, {
        capture: true,
      });
      await nvda.press("Escape", { capture: true });
    },
    info,
  );
  await expect(bell).toBeFocused();
  await expect(bell).toHaveAttribute("aria-expanded", "false");
  expect(
    network.formsCalls.filter((call) => call.method === "PATCH"),
  ).toHaveLength(1);
  await finishForms(page, network, info);
});

for (const disabled of [false, true]) {
  test(`AT-FORM-Mermaid-${disabled ? "readonly" : "editable"} — aperçu réel, description et source dépliable`, async ({
    page,
    browser,
    nvda,
  }, info) => {
    const network = await simulatedFormsNetwork(page);
    await page.goto(network.base);
    await mountProductionScene(page, "/src/components/MarkdownEditor.vue", {
      modelValue:
        "```mermaid\nflowchart LR\n  accTitle: Dependances fictives\n  accDescr: Alpha transmet une information a Beta.\n  A[Alpha] --> B[Beta]\n```",
      disabled,
      ariaLabel: "Description synthétique",
      id: "native-mermaid-description",
    });
    await attachIdentity(nvda, browser.version(), info);
    await focusDocumentStart(page, nvda);
    await tabTo(nvda, "Visualiser l’aperçu", info);
    const preview = await activateCurrent(nvda, info, "mermaid-preview-open");
    await expect(page.getByTestId("markdown-tab-preview")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const image = page.getByRole("img", {
      name: "Dependances fictives",
      exact: true,
    });
    await expect(image).toBeVisible();
    await tabTo(nvda, "Description et source du diagramme", info);
    const expanded = await activateCurrent(nvda, info, "mermaid-source-open");
    await expect(page.locator("details")).toHaveAttribute("open", "");
    const read = await captureStep(
      nvda,
      "mermaid-source-native-reading",
      () => nvda.perform(nvda.keyboardCommands.sayAll, { capture: true }),
      info,
    );
    expect(expanded.text + read.text).toContain("alpha");
    expect(read.text).toContain("beta");
    // Say-all moved the virtual cursor into the source while DOM focus stayed
    // on summary. Native Tab realigns both cursors before activating summary.
    await captureStep(
      nvda,
      "mermaid-return-to-summary-tab-stop",
      async () => {
        await nvda.press("Shift+Tab", { capture: true });
        await nvda.press("Tab", { capture: true });
      },
      info,
    );
    await expect(page.locator("details summary")).toBeFocused();
    await tabTo(nvda, "Description et source du diagramme", info);
    await activateCurrent(nvda, info, "mermaid-source-close");
    await expect(page.locator("details")).not.toHaveAttribute("open", "");
    await shiftTabTo(nvda, "Éditer le texte en format markdown", info);
    await activateCurrent(nvda, info, "mermaid-return-editor");
    await expect(page.getByTestId("markdown-textarea")).toHaveValue(
      /flowchart LR/,
    );
    if (disabled)
      await expect(page.getByTestId("markdown-textarea")).toBeDisabled();
    else {
      await tabTo(nvda, "Description synthétique", info);
      await expect(page.getByTestId("markdown-textarea")).toBeFocused();
    }
    expect(preview.phrases.length).toBeGreaterThan(0);
    await finishForms(page, network, info);
  });
}
