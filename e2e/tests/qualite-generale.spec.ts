import { test } from "../fixtures/test";
import { QualityPage } from "../pom";

/**
 * Non-régression — Qualité générale (protocole `qa/protocoles/qualite-generale.md`).
 * POM strict : aucune spec ne manipule de sélecteur, tout passe par `QualityPage`. Pour la dataviz,
 * on asserte via la bascule graphique/tableau (canvas + tableau coexistent en `v-show`).
 */
test.describe("Qualité générale", () => {
  // La fixture `data` connecte `admin` : indispensable car `/qualite-generale` requiert l'auth.
  test("QAL-01 - la page Qualité générale charge ses widgets", async ({
    page,
    data,
  }) => {
    void data;
    const quality = new QualityPage(page);
    await quality.open();
    await quality.expectLoaded();
  });

  test("QAL-02 - statistiques globales affichées", async ({ page, data }) => {
    void data;
    const quality = new QualityPage(page);
    await quality.open();
    await quality.expectGlobalStatsVisible();
  });

  test("QAL-03 - répartition par IQ : bascule graphique / tableau", async ({
    page,
    data,
  }) => {
    test.skip(
      !(await data.firstApplication()),
      "Aucune application dans le jeu de données",
    );

    const quality = new QualityPage(page);
    await quality.open();
    await quality.expectIqRepartitionTogglesView();
  });

  test("QAL-04 - applications par mois : bascule graphique / tableau", async ({
    page,
    data,
  }) => {
    test.skip(
      !(await data.firstApplication()),
      "Aucune application dans le jeu de données",
    );

    const quality = new QualityPage(page);
    await quality.open();
    await quality.expectApplicationsPerMonthTogglesView();
  });

  test("QAL-05 - évolution de l'IQ moyen : bascule graphique / tableau", async ({
    page,
    data,
  }) => {
    void data;
    const quality = new QualityPage(page);
    await quality.open();
    await quality.expectIqTrendTogglesView();
  });

  test("QAL-06 - évolution de l'IQ moyen : période future affiche l'état vide", async ({
    page,
    data,
  }) => {
    void data;
    const quality = new QualityPage(page);
    await quality.open();
    await quality.expectIqTrendEmptyForFuturePeriod();
  });

  test("QAL-07 - évolution de l'IQ moyen : changer le regroupement recharge sans erreur", async ({
    page,
    data,
  }) => {
    void data;
    const quality = new QualityPage(page);
    await quality.open();
    await quality.changeIqTrendGroupBy("week");
    await quality.changeIqTrendGroupBy("day");
  });
});
