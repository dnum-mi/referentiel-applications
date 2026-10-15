import { expect } from "@playwright/test";
import {
  test,
  attachIdentity,
  captureStep,
  focusDocumentStart,
} from "./fixture.js";
import { activateCurrent } from "./native-utils.js";
import {
  finishSupplement,
  observeSupplement,
  prepareSupplement,
  supplementIds,
} from "./supplement-interactive-utils.js";
import {
  reach,
  enter,
  releaseReply,
  confirmBrowser,
} from "./supplement-native-utils.js";
test.use({ serviceWorkers: "block" });
test.beforeEach(async ({}, info) => {
  info.setTimeout(600_000);
  info.annotations.push({
    type: "RGAA",
    description:
      "7.1.2 — G7/G8 : huit compléments de handlers/rendus distincts, vrais composants et API fictives ; seule la parole native observée constitue une preuve AT",
  });
});

test("AT-SUP-G7-Inline — vrai formulaire de signalement fiche, alerte500 et réessai/table", async ({
  page,
  browser,
  nvda,
}, info) => {
  const network = await prepareSupplement(page, "inline");
  network.mode("inline", "error");
  try {
    await attachIdentity(nvda, browser.version(), info);
    await focusDocumentStart(page, nvda);
    const input = page.getByTestId("report-issue-textarea"),
      save = page.getByTestId("report-issue-submit-btn");
    await enter(
      nvda,
      input,
      "Décrivez votre signalement",
      "Signalement inline AT",
      info,
    );
    network.hold("inline");
    await reach(nvda, save, "Envoyer mon signalement", info);
    await activateCurrent(nvda, info, "supplement-inline500");
    const error = await releaseReply(
      page,
      nvda,
      network,
      "inline",
      async () => {
        await expect(page.getByTestId("report-issue-error")).toContainText(
          "Votre saisie est conservée",
        );
        await expect(save).toBeFocused();
      },
      info,
    );
    expect(error.text).toContain("votre saisie est conservee");
    await expect(input).toHaveValue("Signalement inline AT");
    network.mode("inline", "success");
    network.hold("inline");
    await reach(nvda, save, "Envoyer mon signalement", info);
    await activateCurrent(nvda, info, "supplement-inline-retry");
    const result = await releaseReply(
      page,
      nvda,
      network,
      "inline",
      async () => {
        await expect(input).toHaveValue("");
        await expect(input).toBeFocused();
        await expect(page.getByTestId("reports-table")).toContainText(
          "Signalement inline AT",
        );
      },
      info,
    );
    expect(result.text).toContain("votre proposition sera prise en compte");
    await reach(nvda, input, "Décrivez votre signalement", info);
  } finally {
    network.cancelPending();
    await finishSupplement(page, network, info);
  }
});

test("AT-SUP-G8-Compliances — Scan EcoIndex, édition RGAA et suppression refusée/500/204", async ({
  page,
  browser,
  nvda,
}, info) => {
  const network = await prepareSupplement(page, "compliances");
  network.mode("eco", "error");
  try {
    await attachIdentity(nvda, browser.version(), info);
    await focusDocumentStart(page, nvda);
    const scan = page.getByTestId("compliance-scan-ecoindex-btn");
    await reach(nvda, scan, "Calculer", info);
    network.hold("eco");
    await activateCurrent(nvda, info, "supplement-eco-scan");
    await expect(scan).toHaveAttribute("aria-disabled", "true");
    await expect(scan).toBeFocused();
    const waiting = await captureStep(
      nvda,
      "supplement-eco-current-waiting",
      () =>
        nvda.perform(nvda.keyboardCommands.reportCurrentFocus, {
          capture: true,
        }),
      info,
    );
    expect(waiting.text).toContain("calculer");
    expect(waiting.text).toMatch(/non disponible|indisponible|desactiv/);
    const error = await releaseReply(
      page,
      nvda,
      network,
      "eco",
      async () => {
        await expect(
          page.getByTestId("app-toaster").getByRole("alert"),
        ).toContainText("Scan fictivement refuse");
        await expect(scan).toBeFocused();
      },
      info,
    );
    expect(error.text).toContain("scan fictivement refuse");
    network.mode("eco", "success");
    network.hold("eco");
    await reach(nvda, scan, "Calculer", info);
    await activateCurrent(nvda, info, "supplement-eco-retry");
    const calculated = await releaseReply(
      page,
      nvda,
      network,
      "eco",
      async () => {
        await expect(page.getByTestId("compliance-table")).toContainText(
          "82/100",
        );
        await expect(scan).toBeFocused();
      },
      info,
    );
    expect(calculated.text).toContain("scan eco");
    expect(calculated.text).toContain("effectue avec succes");
    const edit = page.getByTestId("rgaa-edit-btn");
    await reach(nvda, edit, "Modifier la conformité RGAA", info);
    await activateCurrent(nvda, info, "supplement-rgaa-edit");
    const dialog = page.getByRole("dialog", {
      name: "Modifier la conformité RGAA",
      exact: true,
    });
    await expect(dialog).toBeVisible();
    const score = dialog.getByTestId("rgaa-form-score");
    const original = await reach(nvda, score, "Score", info);
    expect(original.text).toMatch(/55|cinquante cinq/);
    await enter(nvda, score, "Score", "66", info);
    network.hold("rgaa");
    await reach(
      nvda,
      dialog.getByTestId("rgaa-form-submit"),
      "Enregistrer",
      info,
    );
    await activateCurrent(nvda, info, "supplement-rgaa-update");
    const updated = await releaseReply(
      page,
      nvda,
      network,
      "rgaa",
      async () => {
        await expect(dialog).not.toBeVisible();
        await expect(page.getByTestId("rgaa-table")).toContainText("66%");
        await expect(edit).toBeFocused();
      },
      info,
    );
    expect(updated.text).toContain("conformite rgaa mise a jour avec succes");
    const remove = page.getByTestId("rgaa-delete-btn");
    await reach(nvda, remove, "Supprimer la conformité RGAA", info);
    await confirmBrowser(
      page,
      nvda,
      info,
      "Supprimer la conformité RGAA",
      false,
    );
    expect(
      network.started.filter((call) => call.method === "DELETE"),
    ).toHaveLength(0);
    for (const succeeds of [false, true]) {
      network.mode("rgaa-delete", succeeds ? "success" : "error");
      network.hold("rgaa-delete");
      await reach(nvda, remove, "Supprimer la conformité RGAA", info);
      await confirmBrowser(
        page,
        nvda,
        info,
        "Supprimer la conformité RGAA",
        true,
      );
      const result = await releaseReply(
        page,
        nvda,
        network,
        "rgaa-delete",
        async () => {
          if (succeeds) {
            await expect(page.getByTestId("rgaa-empty")).toBeVisible();
            await expect(page.getByTestId("rgaa-add-btn")).toBeFocused();
          } else {
            await expect(
              page.getByTestId("app-toaster").getByRole("alert"),
            ).toContainText("Erreur lors de la suppression");
            await expect(remove).toBeFocused();
          }
        },
        info,
      );
      expect(result.text).toContain(
        succeeds
          ? "conformite rgaa supprimee"
          : "erreur lors de la suppression de la conformite rgaa",
      );
    }
  } finally {
    network.cancelPending();
    await finishSupplement(page, network, info);
  }
});

test("AT-SUP-G8-PreferencesDeletes — upsert/delete filtre, suppression label et hébergement", async ({
  page,
  browser,
  nvda,
}, info) => {
  const network = await prepareSupplement(page, "filters");
  try {
    await attachIdentity(nvda, browser.version(), info);
    await focusDocumentStart(page, nvda);
    const accordion = page.getByRole("button", {
      name: "Filtres sauvegardés",
      exact: true,
    });
    await reach(nvda, accordion, "Filtres sauvegardés", info);
    await activateCurrent(nvda, info, "supplement-filters-open");
    const opener = page.getByTestId("save-filter-button");
    await reach(nvda, opener, "Sauvegarder les filtres actuels", info);
    await activateCurrent(nvda, info, "supplement-filter-save-dialog");
    const dialog = page.getByTestId("save-filter-modal");
    await enter(
      nvda,
      dialog.getByRole("textbox"),
      "Nom du filtre",
      "Filtre AT",
      info,
    );
    const save = dialog.getByTestId("confirm-save-filter-button");
    await reach(nvda, save, "Sauvegarder", info);
    await confirmBrowser(
      page,
      nvda,
      info,
      "Remplacer le filtre sauvegardé",
      false,
    );
    expect(network.started).toHaveLength(0);
    for (const succeeds of [false, true]) {
      network.mode("filter", succeeds ? "success" : "error");
      network.hold("filter");
      await reach(nvda, save, "Sauvegarder", info);
      await confirmBrowser(
        page,
        nvda,
        info,
        "Remplacer le filtre sauvegardé",
        true,
      );
      const result = await releaseReply(
        page,
        nvda,
        network,
        "filter",
        async () => {
          if (succeeds) await expect(dialog).not.toBeVisible();
          else {
            await expect(dialog.getByTestId("save-filter-error")).toContainText(
              "Votre saisie est conservée",
            );
            await expect(save).toBeFocused();
          }
        },
        info,
      );
      expect(result.text).toContain(
        succeeds ? "sauvegarde" : "votre saisie est conservee",
      );
    }
    await expect(
      page.getByTestId("saved-filters-list").locator("li"),
    ).toHaveCount(1);
    const remove = page.getByTestId(
      `saved-filter-delete-${supplementIds.saved}`,
    );
    for (const succeeds of [false, true]) {
      network.mode("filter-delete", succeeds ? "success" : "error");
      network.hold("filter-delete");
      await reach(nvda, remove, "Supprimer le filtre Filtre AT", info);
      await confirmBrowser(
        page,
        nvda,
        info,
        "Supprimer définitivement le filtre sauvegardé",
        true,
      );
      const result = await releaseReply(
        page,
        nvda,
        network,
        "filter-delete",
        async () => {
          if (succeeds) {
            await expect(page.getByTestId("saved-filters-list")).toHaveCount(0);
            await expect(opener).toBeFocused();
          } else {
            await expect(
              page.getByTestId("app-toaster").getByRole("alert"),
            ).toContainText("Erreur lors de la suppression du filtre");
            await expect(remove).toBeFocused();
          }
        },
        info,
      );
      if (!succeeds)
        expect(result.text).toContain(
          "erreur lors de la suppression du filtre",
        );
    }
  } finally {
    network.cancelPending();
    await finishSupplement(page, network, info);
  }
  const information = await prepareSupplement(page, "info");
  try {
    await attachIdentity(nvda, browser.version(), info);
    await focusDocumentStart(page, nvda);
    for (const key of ["label", "hosting"] as const) {
      const opener = page
        .getByTestId(
          key === "label" ? "label-delete-btn" : "hosting-delete-btn",
        )
        .first();
      await reach(nvda, opener, "Supprimer", info);
      const opening = await activateCurrent(
        nvda,
        info,
        `supplement-${key}-delete-open`,
      );
      const dialog = page.getByRole("dialog", {
        name: "Confirmation de suppression",
        exact: true,
      });
      await expect(dialog).toBeVisible();
      expect(opening.text).toContain("confirmation de suppression");
      await reach(
        nvda,
        dialog.getByTestId("delete-cancel-btn"),
        "Annuler",
        info,
      );
      await activateCurrent(nvda, info, `supplement-${key}-delete-cancel`);
      await expect(opener).toBeFocused();
      expect(information.started).toHaveLength(key === "label" ? 0 : 2);
      for (const succeeds of [false, true]) {
        await reach(nvda, opener, "Supprimer", info);
        await activateCurrent(nvda, info, `supplement-${key}-delete-reopen`);
        information.mode(key, succeeds ? "success" : "error");
        information.hold(key);
        await reach(
          nvda,
          dialog.getByTestId("delete-confirm-btn"),
          "Confirmer",
          info,
        );
        await activateCurrent(
          nvda,
          info,
          `supplement-${key}-delete-${succeeds}`,
        );
        const destination = page
          .getByTestId(
            succeeds
              ? `info-add-${key}-btn`
              : key === "label"
                ? "label-delete-btn"
                : "hosting-delete-btn",
          )
          .first();
        const result = await releaseReply(
          page,
          nvda,
          information,
          key,
          async () => {
            await expect(dialog).not.toBeVisible();
            await expect(destination).toBeFocused();
          },
          info,
        );
        expect(result.text).toContain(
          succeeds
            ? key === "label"
              ? "nom alternatif supprime avec succes"
              : "hebergement supprime avec succes"
            : key === "label"
              ? "erreur lors de la suppression du nom alternatif"
              : "erreur lors de la suppression de l hebergement",
        );
      }
    }
    await observeSupplement(page, info, "supplement-information-final");
  } finally {
    information.cancelPending();
    await finishSupplement(page, information, info);
  }
});
