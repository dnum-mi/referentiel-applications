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
  prepareSupplement,
} from "./supplement-interactive-utils.js";
import {
  reach,
  enter,
  releaseReply,
  confirmBrowser,
  chooseOrganization,
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

test("AT-SUP-G7-Wizard — contact MAIA, chaîne de création complète/partielle et abandon confirmé", async ({
  page,
  browser,
  nvda,
}, info) => {
  for (const partial of [false, true]) {
    const network = await prepareSupplement(page, "wizard");
    try {
      await attachIdentity(nvda, browser.version(), info);
      await focusDocumentStart(page, nvda);
      await enter(
        nvda,
        page.getByTestId("application-label"),
        "Nom",
        "Application complement AT",
        info,
      );
      await enter(
        nvda,
        page.getByTestId("markdown-textarea"),
        "Description",
        "Description du complement AT",
        info,
      );
      for (let step = 0; step < 2; step++) {
        await reach(
          nvda,
          page.getByTestId("application-next-btn"),
          "Suivant",
          info,
        );
        await activateCurrent(nvda, info, `supplement-wizard-next-${step}`);
      }
      for (const role of ["moa", "moe"] as const) {
        await enter(
          nvda,
          page.getByTestId(`application-${role}-email`),
          `Email du contact ${role.toUpperCase()}`,
          `${role}@example.invalid`,
          info,
        );
        const sync = page.getByTestId(`application-${role}-sync-maia-btn`);
        await reach(
          nvda,
          sync,
          `Synchroniser depuis MAIA (par email) — contact ${role.toUpperCase()}`,
          info,
        );
        network.hold("maia");
        await activateCurrent(nvda, info, `supplement-wizard-maia-${role}`);
        const result = await releaseReply(
          page,
          nvda,
          network,
          "maia",
          async () => {
            await expect(
              page.getByTestId(`application-${role}-firstname`),
            ).toHaveValue("Camille");
            await expect(
              page
                .getByTestId(`application-${role}-organization`)
                .getByRole("combobox"),
            ).toHaveValue("org-synthetic-001");
          },
          info,
        );
        expect(result.text).toContain(
          `organisation ${role} synchronisee depuis maia`,
        );
        const name = await reach(
          nvda,
          page.getByTestId(`application-${role}-firstname`),
          `Prénom du contact ${role.toUpperCase()}`,
          info,
        );
        expect(name.text).toContain("camille");
        await expect(
          page.getByTestId(`application-${role}-lastname`),
        ).toHaveValue("Maia AT");
        if (role === "moa") {
          await reach(
            nvda,
            page.getByTestId("application-next-btn"),
            "Suivant",
            info,
          );
          await activateCurrent(nvda, info, "supplement-wizard-moe-step");
        }
      }
      if (partial) network.mode("wizard-actor", "error");
      network.hold("wizard");
      const save = page.getByTestId("application-submit-btn");
      await reach(nvda, save, "Créer", info);
      await activateCurrent(nvda, info, "supplement-wizard-create");
      const result = await releaseReply(
        page,
        nvda,
        network,
        "wizard",
        async () => {
          if (partial)
            await expect(
              page.getByTestId("application-save-error"),
            ).toContainText("Application créée mais erreur");
          else
            await expect(
              page.getByTestId("app-toaster").getByRole("status"),
            ).toContainText("Application créée avec succès");
        },
        info,
      );
      expect(result.text).toContain(
        partial
          ? "application creee mais erreur"
          : "application creee avec succes",
      );
      expect(
        network.started.filter((call) => call.path.endsWith("/actors")),
      ).toHaveLength(partial ? 1 : 2);
      if (partial) {
        await expect(page.getByTestId("application-moe-email")).toHaveValue(
          "moe@example.invalid",
        );
        await expect(save).toBeFocused();
        await reach(
          nvda,
          page.getByTestId("application-cancel-btn"),
          "Annuler",
          info,
        );
        const opening = await activateCurrent(
          nvda,
          info,
          "supplement-wizard-cancel-open",
        );
        const dialog = page.getByRole("dialog", {
          name: "Annuler la création de l'application",
          exact: true,
        });
        await expect(dialog).toBeVisible();
        expect(opening.text).toMatch(/dialogue|dialog/);
        await reach(
          nvda,
          page.getByTestId("application-cancel-modal-confirm"),
          "Confirmer",
          info,
        );
        await activateCurrent(nvda, info, "supplement-wizard-cancel-confirm");
        await expect(dialog).not.toBeVisible();
      }
    } finally {
      network.cancelPending();
      await finishSupplement(page, network, info);
    }
  }
});

test("AT-SUP-G7-Actor — synchronisation MAIA propre au formulaire puis création et résultat parent", async ({
  page,
  browser,
  nvda,
}, info) => {
  const network = await prepareSupplement(page, "actor");
  try {
    await attachIdentity(nvda, browser.version(), info);
    await focusDocumentStart(page, nvda);
    const opener = page.getByTestId("actor-add-btn");
    await reach(nvda, opener, "Ajouter un acteur", info);
    const opening = await activateCurrent(nvda, info, "supplement-actor-open");
    const dialog = page.getByRole("dialog", {
      name: "Ajouter un acteur",
      exact: true,
    });
    await expect(dialog).toBeVisible();
    expect(opening.text).toMatch(/dialogue|dialog/);
    const type = dialog.getByTestId("actor-type-select");
    const currentType = await reach(nvda, type, "Type d'acteur", info);
    expect(currentType.text).toMatch(/liste|combo/);
    await captureStep(
      nvda,
      "supplement-actor-native-type",
      async () => {
        await nvda.press("Home", { capture: true });
        await nvda.press("ArrowDown", { capture: true });
      },
      info,
    );
    await expect(type).toHaveValue("11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    await enter(
      nvda,
      dialog.getByTestId("actor-email-input"),
      "Email",
      "nouvel-acteur@example.invalid",
      info,
    );
    await reach(
      nvda,
      dialog.getByTestId("admin-user-sync-maia-btn"),
      "Synchroniser depuis MAIA",
      info,
    );
    network.hold("maia");
    await activateCurrent(nvda, info, "supplement-actor-maia");
    const synchronized = await releaseReply(
      page,
      nvda,
      network,
      "maia",
      async () => {
        await expect(dialog.getByTestId("actor-firstname-input")).toHaveValue(
          "Camille",
        );
      },
      info,
    );
    expect(synchronized.text).toContain(
      "organisation synchronisee depuis maia",
    );
    const name = await reach(
      nvda,
      dialog.getByTestId("actor-firstname-input"),
      "Prénom",
      info,
    );
    expect(name.text).toContain("camille");
    network.hold("actor");
    await reach(
      nvda,
      dialog.getByTestId("actor-submit-btn"),
      "Enregistrer",
      info,
    );
    await activateCurrent(nvda, info, "supplement-actor-create");
    const saved = await releaseReply(
      page,
      nvda,
      network,
      "actor",
      async () => {
        await expect(dialog).not.toBeVisible();
        await expect(opener).toBeFocused();
      },
      info,
    );
    expect(saved.text).toContain("acteur sauvegarde");
    expect(network.records().actors).toHaveLength(2);
    await reach(nvda, opener, "Ajouter un acteur", info);
  } finally {
    network.cancelPending();
    await finishSupplement(page, network, info);
  }
});

test("AT-SUP-G7-Bulk — type/organisation conditionnels et sauvegarde groupée confirmée", async ({
  page,
  browser,
  nvda,
}, info) => {
  const network = await prepareSupplement(page, "actor-bulk");
  try {
    await attachIdentity(nvda, browser.version(), info);
    await focusDocumentStart(page, nvda);
    const opener = page.getByTestId("admin-actor-edit-all-btn");
    await reach(nvda, opener, "Modifier par email", info);
    await activateCurrent(nvda, info, "supplement-bulk-open");
    const dialog = page.getByRole("dialog", {
      name: "Modifier les acteurs par email",
      exact: true,
    });
    await expect(dialog).toBeVisible();
    const apps = dialog.getByTestId("admin-actor-edit-all-apps");
    const appsButton = apps.getByRole("button", {
      name: "Applications concernées",
      exact: true,
    });
    await reach(nvda, appsButton, "Applications concernées", info);
    await activateCurrent(nvda, info, "supplement-bulk-applications-open");
    const beta = apps.getByRole("checkbox", {
      name: "Beta fictive",
      exact: true,
    });
    const selected = await reach(nvda, beta, "Beta fictive", info);
    expect(selected.text).toMatch(/case.*cocher|interrupteur/);
    const deselected = await captureStep(
      nvda,
      "supplement-bulk-application-exclude",
      () => nvda.press("Space", { capture: true }),
      info,
    );
    await expect(beta).not.toBeChecked();
    expect(deselected.text).toContain("non coche");
    await reach(nvda, appsButton, "Applications concernées", info);
    await activateCurrent(nvda, info, "supplement-bulk-applications-close");
    for (const name of [
      "Remplacer le type d'acteur",
      "Remplacer l'organisation",
    ]) {
      const checkbox = dialog.getByRole("checkbox", { name, exact: true });
      const state = await reach(nvda, checkbox, name, info);
      expect(state.text).toMatch(/case.*cocher|interrupteur/);
      expect(state.text).toContain("non coche");
      const changed = await captureStep(
        nvda,
        `supplement-bulk-checkbox-${name}`,
        () => nvda.press("Space", { capture: true }),
        info,
      );
      await expect(checkbox).toBeChecked();
      expect(changed.text).toMatch(/\bcochee?\b/);
      expect(changed.text).not.toContain("non coche");
    }
    await reach(
      nvda,
      dialog.getByTestId("admin-actor-all-type-select"),
      "Type d'acteur",
      info,
    );
    const org = dialog.getByTestId("admin-actor-all-organization");
    await enter(
      nvda,
      org.getByRole("textbox"),
      /organisation.*edition/,
      "org",
      info,
    );
    await expect(
      org.getByRole("combobox").locator('option[value="org-synthetic-001"]'),
    ).toHaveCount(1);
    await chooseOrganization(nvda, org.getByRole("combobox"), info);
    await enter(
      nvda,
      dialog.getByTestId("admin-actor-all-lastname-input"),
      "Nom",
      "Nom groupe AT",
      info,
    );
    const save = dialog.getByTestId("admin-actor-save-all-btn");
    await reach(nvda, save, "Modifier", info);
    await confirmBrowser(
      page,
      nvda,
      info,
      "Confirmer la modification des acteurs",
      false,
    );
    expect(network.started).toHaveLength(0);
    await expect(
      dialog.getByTestId("admin-actor-all-lastname-input"),
    ).toHaveValue("Nom groupe AT");
    network.hold("bulk");
    await reach(nvda, save, "Modifier", info);
    await confirmBrowser(
      page,
      nvda,
      info,
      "Confirmer la modification des acteurs",
      true,
    );
    const saved = await releaseReply(
      page,
      nvda,
      network,
      "bulk",
      async () => {
        await expect(dialog).not.toBeVisible();
        await expect(opener).toBeFocused();
      },
      info,
    );
    expect(saved.text).toContain("acteur");
    expect(saved.text).toContain("mis a jour avec succes");
    expect(network.started[0].body).toMatchObject({
      actorTypeId: "type-u13-synthetic",
      organizationId: "org-synthetic-001",
      lastname: "Nom groupe AT",
      applicationIds: ["11111111-1111-4111-8111-111111111111"],
    });
  } finally {
    network.cancelPending();
    await finishSupplement(page, network, info);
  }
});

test("AT-SUP-G7-Technology — produit connu, description de date automatique et PATCH/relecture", async ({
  page,
  browser,
  nvda,
}, info) => {
  const network = await prepareSupplement(page, "technology");
  try {
    await attachIdentity(nvda, browser.version(), info);
    await focusDocumentStart(page, nvda);
    const opener = page.getByTestId("technology-edit-btn").first();
    await reach(nvda, opener, "Modifier la technologie", info);
    await activateCurrent(nvda, info, "supplement-technology-open");
    const dialog = page.getByRole("dialog", {
      name: "Modifier la technologie",
      exact: true,
    });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId("technology-manual-eol-input")).toHaveCount(
      0,
    );
    const version = dialog.getByTestId("technology-version-input");
    const field = await reach(nvda, version, "Version", info);
    expect(field.text).toContain("fin de vie calculee automatiquement");
    await enter(nvda, version, "Version", "17", info);
    network.hold("technology");
    await reach(
      nvda,
      dialog.getByTestId("technology-submit-btn"),
      "Enregistrer",
      info,
    );
    await activateCurrent(nvda, info, "supplement-technology-save");
    const saved = await releaseReply(
      page,
      nvda,
      network,
      "technology",
      async () => {
        await expect(dialog).not.toBeVisible();
        await expect(page.getByTestId("technology-table")).toContainText("17");
        await expect(
          page.getByTestId("technology-edit-btn").first(),
        ).toBeFocused();
      },
      info,
    );
    expect(saved.text).toContain("technologie sauvegardee avec succes");
    await reach(
      nvda,
      page.getByTestId("technology-edit-btn").first(),
      "Modifier la technologie",
      info,
    );
  } finally {
    network.cancelPending();
    await finishSupplement(page, network, info);
  }
});

test("AT-SUP-G7-Data — datalist existante, famille créée, édition et exposition réussies", async ({
  page,
  browser,
  nvda,
}, info) => {
  const network = await prepareSupplement(page, "data");
  try {
    await attachIdentity(nvda, browser.version(), info);
    await focusDocumentStart(page, nvda);
    const opener = page.getByTestId("data-application-add-btn");
    await reach(nvda, opener, "Ajouter", info);
    await activateCurrent(nvda, info, "supplement-data-open");
    const dialog = page.getByTestId("data-application-modal");
    await expect(dialog).toBeVisible();
    const search = dialog.getByTestId("data-description-search-input");
    await enter(nvda, search, "Donnée d'application", "Donnee", info);
    const option = dialog
      .getByTestId("data-descriptions-list")
      .locator("option")
      .first();
    await expect(option).toBeAttached();
    const chosen = await captureStep(
      nvda,
      "supplement-existing-datalist-native",
      async () => {
        await nvda.press("ArrowDown", { capture: true });
        await nvda.press("Enter", { capture: true });
      },
      info,
    );
    expect(chosen.text).toContain("donnee existante at");
    await expect(search).toHaveValue((await option.innerText()).trim());
    network.hold("data");
    await reach(
      nvda,
      dialog.getByTestId("data-application-submit-btn"),
      "Ajouter",
      info,
    );
    await activateCurrent(nvda, info, "supplement-data-attach");
    const attached = await releaseReply(
      page,
      nvda,
      network,
      "data",
      async () => {
        await expect(dialog).not.toBeVisible();
        await expect(opener).toBeFocused();
      },
      info,
    );
    expect(attached.text).toContain("donnee rattachee");
    const editOpener = page.getByTestId("data-application-detail-edit-btn");
    await reach(nvda, editOpener, "Modifier", info);
    await activateCurrent(nvda, info, "supplement-data-edit");
    await enter(
      nvda,
      dialog.getByTestId("new-description-name-input"),
      "Nom de la donnée",
      "Donnee modifiee AT",
      info,
    );
    await reach(
      nvda,
      dialog.getByTestId("new-description-create-family-toggle"),
      "Créer une nouvelle famille",
      info,
    );
    await activateCurrent(nvda, info, "supplement-family-open");
    await enter(
      nvda,
      dialog.getByTestId("new-family-path-input"),
      "Chemin de la nouvelle famille",
      "Test/Famille ajoutee AT",
      info,
    );
    await reach(
      nvda,
      dialog.getByTestId("new-family-add-btn"),
      "Ajouter",
      info,
    );
    await activateCurrent(nvda, info, "supplement-family-create");
    await expect(dialog.getByTestId("new-description-families")).toContainText(
      "Famille ajoutee AT",
    );
    const added = await reach(
      nvda,
      dialog.getByRole("button", {
        name: "Retirer la famille : Test/Famille ajoutee AT",
        exact: true,
      }),
      "Retirer la famille",
      info,
    );
    expect(added.text).toContain("famille ajoutee at");
    await enter(
      nvda,
      dialog.getByTestId("data-application-example-input"),
      "Exemple",
      "Valeur modifiee AT",
      info,
    );
    network.hold("data");
    await reach(
      nvda,
      dialog.getByTestId("data-application-submit-btn"),
      "Modifier",
      info,
    );
    await activateCurrent(nvda, info, "supplement-data-save");
    await releaseReply(
      page,
      nvda,
      network,
      "data",
      async () => {
        await expect(dialog).not.toBeVisible();
        await expect(
          page.getByTestId("data-application-detail-name"),
        ).toContainText("Donnee modifiee AT");
        await expect(editOpener).toBeFocused();
      },
      info,
    );
    const exposureOpener = page.getByTestId("data-exposure-add-btn");
    await reach(nvda, exposureOpener, "Ajouter", info);
    await activateCurrent(nvda, info, "supplement-exposure-open");
    const exposure = page.getByTestId("data-exposure-modal");
    await expect(exposure).toBeVisible();
    await enter(
      nvda,
      exposure.getByTestId("data-exposure-type-input"),
      "Type d'exposition",
      "API AT",
      info,
    );
    network.hold("exposure");
    await reach(
      nvda,
      exposure.getByTestId("data-exposure-submit-btn"),
      "Ajouter",
      info,
    );
    await activateCurrent(nvda, info, "supplement-exposure-save");
    const saved = await releaseReply(
      page,
      nvda,
      network,
      "exposure",
      async () => {
        await expect(exposure).not.toBeVisible();
        await expect(exposureOpener).toBeFocused();
      },
      info,
    );
    expect(saved.text).toContain("exposition");
    expect(network.records().exposures).toHaveLength(1);
  } finally {
    network.cancelPending();
    await finishSupplement(page, network, info);
  }
});
