import { test, expect } from "../fixtures/test";
import { ApplicationPage, loginAs } from "../pom";

/**
 * Non-régression — Conformités : éco-conception & homologation (protocole `qa/protocoles/conformites.md`).
 * Couvre les nouveautés de l'issue #1825 (homologation, calcul/permission/reset éco-index, grade A→G).
 * POM strict : aucune spec ne manipule de sélecteur. Provisioning déterministe via la datafeature (admin).
 */
test.describe("Conformités — éco-conception & homologation", () => {
  const USER_EMAIL = "user@example.com";

  test("CMP-01 - homologation : « Non réalisée » et « À mettre en place »", async ({
    page,
    data,
  }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id, "tab-compliances");

    await fiche.setHomologationStatus("Non réalisée");
    await fiche.expectHomologationPreview(/Non réalisée/i);

    await fiche.setHomologationStatus("À mettre en place");
    await fiche.expectHomologationPreview(/À mettre en place/i);
  });

  test("CMP-04 - éco-index : affichage du score et du grade A→G", async ({
    page,
    data,
  }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    // Score 95 → grade A
    await data.setEcoIndex(app!.id, "https://ecoindex.example/cmp04", 95);
    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id, "tab-compliances");
    await fiche.expectEcoIndexGrade("A");

    // Score 12 → grade F (vérifie le mapping de grade dans l'UI)
    await data.setEcoIndex(app!.id, "https://ecoindex.example/cmp04", 12);
    await fiche.openTab("tab-compliances");
    await fiche.expectEcoIndexGrade("F");
  });

  test("CMP-03 - éco-index : modifier l'URL cible réinitialise le score", async ({
    page,
    data,
  }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    await data.setEcoIndex(app!.id, "https://ecoindex.example/before", 80);
    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id, "tab-compliances");
    await fiche.expectEcoIndexGrade("B"); // 80 → B, le score est bien posé

    await fiche.changeEcoIndexUrlAndSave("https://ecoindex.example/after");
    await fiche.expectEcoIndexNotCalculated();

    // Confirme la réinitialisation côté serveur.
    const compliance = await data.getCompliance(app!.id);
    expect(compliance?.eco_index_score ?? null).toBeNull();
  });

  test("CMP-02 - éco-index : seuls les droits d'écriture peuvent calculer", async ({
    page,
    browser,
    data,
  }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    // Admin : bouton « Calculer » actif.
    const adminFiche = new ApplicationPage(page);
    await adminFiche.open(app!.id, "tab-compliances");
    await adminFiche.expectEcoIndexScanEnabled();

    // Lecteur : bouton « Calculer » désactivé (contexte navigateur séparé, cf. PRM-09).
    await data.resetUser(USER_EMAIL);
    const ctx = await browser.newContext();
    try {
      const userPage = await ctx.newPage();
      await loginAs(userPage, "user");
      const userFiche = new ApplicationPage(userPage);
      await userFiche.open(app!.id, "tab-compliances");
      await userFiche.expectEcoIndexScanDisabled();
    } finally {
      await ctx.close();
    }
  });

  test("CMP-05 - DIMA : la liste de durée propose les valeurs autorisées (#1901)", async ({
    page,
    data,
  }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id, "tab-compliances");
    await fiche.expectComplianceDurationOptions(
      "DIMA",
      "compliance-dima-duration",
      [96, 72, 48, 24, 4, 1, 0],
    );
  });

  test("CMP-06 - PDMA : la liste de durée propose les valeurs autorisées (#1901)", async ({
    page,
    data,
  }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id, "tab-compliances");
    await fiche.expectComplianceDurationOptions(
      "PDMA",
      "compliance-pdma-duration",
      [48, 24, 2, 0],
    );
  });
});
