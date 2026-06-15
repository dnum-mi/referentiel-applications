import { test, expect } from "../fixtures/test";
import { AdminPage, ApplicationPage, loginAs } from "../pom";
import { ApiClient } from "../fixtures/api-client";

/**
 * Non-régression — Intégration MAIA (protocole `qa/protocoles/maia.md`). Cas #1-4 de l'issue #1825.
 * La stack tourne avec `MOCK_MAIA_SERVICE=true` (organisation mock « …SEINE-ET-MARNE… ») : les appels
 * MAIA sont déterministes et sans dépendance réseau externe. POM strict.
 */
test.describe("Intégration MAIA", () => {
  test("MAI-01 - première connexion : organisation MAIA assignée par défaut", async ({
    page,
  }) => {
    // `support` n'a (a priori) jamais été provisionné : sa 1ʳᵉ connexion déclenche l'assignation MAIA.
    await loginAs(page, "support");
    const me = await (await ApiClient.fromPage(page)).meRaw();
    const org = me?.organization as { path?: string } | null | undefined;
    expect(org?.path ?? "").toMatch(/SEINE-ET-MARNE/i);
  });

  test("MAI-02 - import des informations d'un acteur depuis MAIA", async ({
    page,
    data,
  }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id, "tab-actors");
    await fiche.openAddActorForm();
    // L'import MAIA exige un email d'utilisateur existant (seedé) ; le mock renvoie alors ses infos.
    await fiche.importActorFromMaia("user@example.com");
    await fiche.expectActorFirstnameFilled();
  });

  test("MAI-03 - le champ email précède le champ organisation", async ({
    page,
    data,
  }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id, "tab-actors");
    await fiche.openAddActorForm();
    await fiche.expectActorEmailBeforeOrganization();
  });

  test("MAI-04 - batch admin : synchroniser les acteurs avec MAIA", async ({
    page,
  }) => {
    await loginAs(page, "admin");
    const admin = new AdminPage(page);
    await admin.open();
    await admin.openBatchDataTab();
    await admin.runMaiaActorBatchAndExpectToast();
  });
});
