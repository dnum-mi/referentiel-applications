import { expect } from "@playwright/test";
import {
  test,
  attachIdentity,
  captureStep,
  focusDocumentStart,
  normalizeSpeech,
} from "./fixture.js";
import { activateCurrent, tabTo } from "./native-utils.js";
import {
  adminNetwork,
  finishAdmin,
  mountAdminScene,
} from "./admin-interactive-utils.js";
import { catalogueCases } from "./admin-catalogue-cases.js";

test.use({ serviceWorkers: "block" });
test.beforeEach(async ({}, info) => {
  info.setTimeout(480_000);
  info.annotations.push({
    type: "RGAA",
    description:
      "7.1.2 — complément U14 : édition et suppression refusées, valeurs fictives, variantes propres ; aucune conformité globale déduite",
  });
});

for (const current of catalogueCases) {
  test(`AT-INT-U14-catalogue-${current.scene} — saisie, confirmation, échecs et retour`, async ({
    page,
    browser,
    nvda,
  }, info) => {
    const network = await adminNetwork(page);
    const expectedBody: Record<string, string | number | boolean | null> = {};
    try {
      await page.goto(network.base);
      await mountAdminScene(page, current.scene);
      await attachIdentity(nvda, browser.version(), info);
      await focusDocumentStart(page, nvda);
      expect((await tabTo(nvda, current.editName, info)).text).toContain(
        "bouton",
      );
      const edit = page.getByTestId(current.editId).first();
      await expect(edit).toBeFocused();
      const opened = await activateCurrent(
        nvda,
        info,
        `${current.scene}-edit-open`,
      );
      const dialog = page.getByRole("dialog");
      await expect(
        dialog.getByRole("heading", { name: current.editTitle, exact: true }),
      ).toBeVisible();
      expect(opened.text).toContain(normalizeSpeech(current.editTitle));

      for (const field of current.fields) {
        // Les noms accessibles incluent les indications : le préfixe désigne le champ sans changer son oracle de valeur.
        const name = field.name.split(" (")[0];
        await tabTo(nvda, name, info);
        const input = dialog.getByTestId(field.id);
        await expect(input).toBeFocused();
        await captureStep(
          nvda,
          `${current.scene}-${field.key}-select-all`,
          () => nvda.press("Control+a", { capture: true }),
          info,
        );
        await captureStep(
          nvda,
          `${current.scene}-${field.key}-type`,
          () => nvda.type(field.input, { capture: true }),
          info,
        );
        await expect(input).toHaveValue(field.input);
        expectedBody[field.key] =
          field.role === "spinbutton" ? Number(field.input) : field.input;
      }

      if (current.scene === "organization") {
        await tabTo(nvda, "Direction métier", info);
        const division = dialog.getByRole("combobox", {
          name: /^Direction métier/,
        });
        await expect(division).toBeFocused();
        await captureStep(
          nvda,
          "organization-detach-direction",
          () => nvda.press("Alt+ArrowDown", { capture: true }),
          info,
        );
        await captureStep(
          nvda,
          "organization-direction-first-option",
          () => nvda.press("Home", { capture: true }),
          info,
        );
        await captureStep(
          nvda,
          "organization-direction-commit",
          () => nvda.press("Enter", { capture: true }),
          info,
        );
        await expect(division).toHaveValue("");
        expectedBody.businessDivisionId = null;
        await tabTo(nvda, "Ajouter une référence MAIA", info);
        const maia = dialog.getByTestId("organization-maia-reference-input");
        await expect(maia).toBeFocused();
        await captureStep(
          nvda,
          "organization-maia-select-all",
          () => nvda.press("Control+a", { capture: true }),
          info,
        );
        await captureStep(
          nvda,
          "organization-maia-type",
          () => nvda.type("ORG/QA/REFERENCE", { capture: true }),
          info,
        );
        await tabTo(nvda, "Ajouter la référence MAIA", info);
        await expect(
          dialog.getByTestId("organization-maia-reference-add-btn"),
        ).toBeFocused();
        await activateCurrent(nvda, info, "organization-maia-add-start");
        await expect.poll(() => network.pending.length).toBe(1);
        expect(network.pending[0].body).toMatchObject({
          maiaRef: "ORG/QA/REFERENCE",
        });
        const maiaFailure = await captureStep(
          nvda,
          "organization-maia-add-error",
          async () => {
            await nvda.capture(
              async () => {
                network.release("error");
                await expect(dialog).toContainText(
                  "Erreur lors de l'ajout de la référence MAIA",
                );
                await page.waitForTimeout(1500);
              },
              { capture: true },
            );
          },
          info,
        );
        expect(maiaFailure.text).toContain(
          normalizeSpeech("Erreur lors de l'ajout de la référence MAIA"),
        );
        await expect(maia).toHaveValue("ORG/QA/REFERENCE");
      }

      if (current.scene === "mdit") {
        await tabTo(nvda, "Campagne active", info);
        const active = dialog.getByRole("checkbox", {
          name: /Campagne active/,
        });
        await expect(active).toBeFocused();
        await expect(active).toBeChecked();
        await captureStep(
          nvda,
          "mdit-deactivate-space",
          () => nvda.press("Space", { capture: true }),
          info,
        );
        await expect(active).not.toBeChecked();
        const inactive = await captureStep(
          nvda,
          "mdit-deactivate-native-state",
          () =>
            nvda.perform(nvda.keyboardCommands.reportCurrentFocus, {
              capture: true,
            }),
          info,
        );
        expect(inactive.text).toContain(normalizeSpeech("Campagne active"));
        expect(inactive.text).toMatch(/non coche|decoche|desactive/);
        expectedBody.isActive = false;
      }

      await tabTo(nvda, current.saveName, info);
      const save = dialog.getByTestId(current.saveId);
      await expect(save).toBeFocused();
      await activateCurrent(nvda, info, `${current.scene}-save-start`);
      await expect.poll(() => network.pending.length).toBe(1);
      expect(network.pending[0].body).toEqual(expectedBody);
      const saveFailure = await captureStep(
        nvda,
        `${current.scene}-save-error`,
        async () => {
          await nvda.capture(
            async () => {
              network.release("error");
              await expect(dialog).toContainText(current.saveError);
              await page.waitForTimeout(1500);
            },
            { capture: true },
          );
        },
        info,
      );
      expect(saveFailure.text).toContain(normalizeSpeech(current.saveError));
      for (const field of current.fields)
        await expect(dialog.getByTestId(field.id)).toHaveValue(field.input);
      expect(
        await dialog.evaluate((element) =>
          element.contains(document.activeElement),
        ),
      ).toBe(true);
      if (current.scene === "tags") {
        await tabTo(nvda, current.saveName, info);
        await activateCurrent(nvda, info, "tags-slow-save-start");
        await expect.poll(() => network.pending.length).toBe(1);
        await tabTo(nvda, "Annuler la modification", info);
        const cancel = dialog.getByTestId("admin-cancel-btn");
        await expect(cancel).toBeFocused();
        await captureStep(
          nvda,
          "tags-slow-error-preserve-choice",
          async () => {
            await nvda.capture(
              async () => {
                network.release("error");
                await expect(dialog).toContainText(current.saveError);
                await page.waitForTimeout(1500);
              },
              { capture: true },
            );
          },
          info,
        );
        await expect(cancel).toBeFocused();
        const chosen = await captureStep(
          nvda,
          "tags-choice-after-error",
          () =>
            nvda.perform(nvda.keyboardCommands.reportCurrentFocus, {
              capture: true,
            }),
          info,
        );
        expect(chosen.text).toContain(
          normalizeSpeech("Annuler la modification"),
        );
      }
      await tabTo(
        nvda,
        ["organization", "tags", "sources"].includes(current.scene)
          ? "Annuler la modification"
          : "Annuler",
        info,
      );
      await activateCurrent(nvda, info, `${current.scene}-cancel-edit-command`);
      await expect(dialog).not.toBeVisible();
      await expect(edit).toBeFocused();
      const editReturn = await captureStep(
        nvda,
        `${current.scene}-edit-return`,
        () =>
          nvda.perform(nvda.keyboardCommands.reportCurrentFocus, {
            capture: true,
          }),
        info,
      );
      expect(editReturn.text).toContain(normalizeSpeech(current.editName));

      const del = page.getByTestId(current.deleteId).first();
      await tabTo(nvda, current.deleteName, info);
      await expect(del).toBeFocused();
      if (current.scene === "organization") {
        // La réponse simulée décrit un administrateur rattaché : aucune modification du périmètre réel.
        network.state.scopedAdmin = true;
        const blocked = await activateCurrent(
          nvda,
          info,
          "organization-delete-blocked-open",
        );
        await expect(dialog.getByTestId(current.confirmId)).toBeDisabled();
        await expect(dialog).toContainText(
          "Réaffectez leur périmètre à une autre organisation",
        );
        await info.attach("organization-blocked-open-speech", {
          body: JSON.stringify(blocked.phrases),
          contentType: "application/json",
        });
        const details = await captureStep(
          nvda,
          "organization-delete-blocked-read",
          async () => {
            await nvda.perform(nvda.keyboardCommands.sayAll, { capture: true });
            await nvda.capture(
              async () => {
                await page.waitForTimeout(30_000);
              },
              { capture: true },
            );
          },
          info,
        );
        expect(details.text).toContain(
          normalizeSpeech(
            "Des administrateurs ont cette organisation pour périmètre",
          ),
        );
        expect(details.text).toContain(
          normalizeSpeech("Réaffectez leur périmètre à une autre organisation"),
        );
        expect(network.pending).toHaveLength(0);
        await tabTo(nvda, "Annuler la suppression", info);
        await activateCurrent(nvda, info, "organization-blocked-delete-cancel");
        await expect(del).toBeFocused();
        network.state.scopedAdmin = false;
      }

      const confirmation = await activateCurrent(
        nvda,
        info,
        `${current.scene}-delete-open`,
      );
      await expect(
        dialog.getByRole("heading", { name: current.deleteTitle, exact: true }),
      ).toBeVisible();
      expect(confirmation.text).toContain(normalizeSpeech(current.deleteTitle));
      const readConfirmation = await captureStep(
        nvda,
        `${current.scene}-delete-warning-read`,
        async () => {
          await nvda.perform(nvda.keyboardCommands.sayAll, { capture: true });
          await nvda.capture(
            async () => {
              await page.waitForTimeout(30_000);
            },
            { capture: true },
          );
        },
        info,
      );
      for (const phrase of current.confirmation)
        expect(readConfirmation.text).toContain(normalizeSpeech(phrase));
      await tabTo(nvda, current.confirmName, info);
      await expect(dialog.getByTestId(current.confirmId)).toBeFocused();
      await activateCurrent(nvda, info, `${current.scene}-delete-start`);
      await expect.poll(() => network.pending.length).toBe(1);
      const deleteFailure = await captureStep(
        nvda,
        `${current.scene}-delete-error`,
        async () => {
          await nvda.capture(
            async () => {
              network.release("error");
              await expect(page.getByTestId("app-toaster")).toContainText(
                current.deleteError,
              );
              await expect(dialog).toBeVisible();
              await page.waitForTimeout(1500);
            },
            { capture: true },
          );
        },
        info,
      );
      expect(deleteFailure.text).toContain(
        normalizeSpeech(current.deleteError),
      );
      expect(
        await dialog.evaluate((element) =>
          element.contains(document.activeElement),
        ),
      ).toBe(true);
      await tabTo(
        nvda,
        current.scene === "hosting" ? "Annuler" : "Annuler la suppression",
        info,
      );
      await activateCurrent(
        nvda,
        info,
        `${current.scene}-cancel-delete-command`,
      );
      await expect(dialog).not.toBeVisible();
      await expect(del).toBeFocused();
      const deleteReturn = await captureStep(
        nvda,
        `${current.scene}-delete-return`,
        () =>
          nvda.perform(nvda.keyboardCommands.reportCurrentFocus, {
            capture: true,
          }),
        info,
      );
      expect(deleteReturn.text).toContain(normalizeSpeech(current.deleteName));
      expect(network.unhandled).toEqual([]);
      await finishAdmin(page, network, info);
    } finally {
      network.cancelPending();
    }
  });
}
