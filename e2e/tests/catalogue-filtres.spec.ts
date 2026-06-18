import { test } from "../fixtures/test";
import { SearchPage } from "../pom";

/**
 * Non-régression — Catalogue : filtres avancés résiduels (protocole `qa/protocoles/catalogue-filtres.md`).
 * Étend CAT (CAT-01..17) avec les filtres de la sidebar non couverts. POM strict : tout passe par
 * `SearchPage` ; chaque filtre est validé par sa propagation dans l'URL (`waitForSearchParams`).
 * La fixture `data` connecte `admin` (la recherche requiert l'authentification).
 */
test.describe("Catalogue — filtres avancés", () => {
  test("CSF-01 - filtre Qualité IQ min/max reflété dans iqGte/iqLte", async ({
    page,
    data,
  }) => {
    void data;
    const search = new SearchPage(page);
    await search.open();
    await search.filterByQualityRange(30, 70);
  });

  test("CSF-02 - décocher « Sans statut » pose currentStatus__isNull=false", async ({
    page,
    data,
  }) => {
    void data;
    const search = new SearchPage(page);
    await search.open();
    await search.toggleWithoutStatus();
  });

  test("CSF-03 - filtre « Sans hébergement » reflété dans missingHosting", async ({
    page,
    data,
  }) => {
    void data;
    const search = new SearchPage(page);
    await search.open();
    await search.filterMissingHosting();
  });

  test("CSF-04 - filtre Priorité de redémarrage reflété dans priorityRestart", async ({
    page,
    data,
  }) => {
    void data;
    const search = new SearchPage(page);
    await search.open();
    await search.filterByPriorityRestart("R0");
  });

  test("CSF-05 - filtre Conformité « Présent » reflété dans compliancePresent__in", async ({
    page,
    data,
  }) => {
    void data;
    const search = new SearchPage(page);
    await search.open();
    await search.setComplianceState("rgaa", "present");
  });

  test("CSF-06 - filtre Conformité « Absent » migre vers complianceAbsent__in", async ({
    page,
    data,
  }) => {
    void data;
    const search = new SearchPage(page);
    await search.open();
    await search.setComplianceState("rgaa", "present");
    await search.setComplianceState("rgaa", "absent");
    search.expectParamAbsent("compliancePresent__in");
  });

  test("CSF-07 - filtre Email acteur reflété dans actorEmail", async ({
    page,
    data,
  }) => {
    void data;
    const search = new SearchPage(page);
    await search.open();
    await search.filterByActorEmail("e2e-csf@example.com");
  });

  test("CSF-08 - filtre « Sans MOA » reflété dans missingMoa", async ({
    page,
    data,
  }) => {
    void data;
    const search = new SearchPage(page);
    await search.open();
    await search.selectActorOption("missingMoa");
  });

  test("CSF-09 - filtre « Sans MOE » exclut « Sans MOA »", async ({
    page,
    data,
  }) => {
    void data;
    const search = new SearchPage(page);
    await search.open();
    await search.selectActorOption("missingMoa");
    await search.selectActorOption("missingMoe");
    search.expectParamAbsent("missingMoa");
  });

  test("CSF-10 - filtre Source de données reflété dans dataSourceName", async ({
    page,
    data,
  }) => {
    void data;
    const search = new SearchPage(page);
    await search.open();
    await search.filterByDataSource("E2E-CSF-source");
  });

  test("CSF-11 - filtre Lien externe reflété dans link", async ({
    page,
    data,
  }) => {
    void data;
    const search = new SearchPage(page);
    await search.open();
    await search.filterByExternalLink("e2e-csf-link");
  });

  test("CSF-12 - la sidebar des filtres se replie puis se ré-affiche", async ({
    page,
    data,
  }) => {
    void data;
    const search = new SearchPage(page);
    await search.open();
    await search.toggleSidebarTwice();
  });

  test("CSF-13 - plusieurs filtres résiduels coexistent dans l'URL", async ({
    page,
    data,
  }) => {
    void data;
    const search = new SearchPage(page);
    await search.open();
    await search.filterByQualityRange(20, 80);
    await search.filterMissingHosting();
    await search.filterByDataSource("E2E-CSF-combo");
    search.expectParamsPresent(
      "iqGte",
      "iqLte",
      "missingHosting",
      "dataSourceName",
    );
  });

  test("CSF-14 - filtre Type d'acteur reflété dans actorType", async ({
    page,
    data,
  }) => {
    void data;
    const search = new SearchPage(page);
    await search.open();
    const values = await search.actorTypeOptionValues();
    test.skip(
      values.length === 0,
      "Aucun type d'acteur dans le jeu de données",
    );
    await search.filterByActorType(values[0]);
  });

  test("CSF-15 - filtre Hébergement par fournisseur reflété dans hostingProvider", async ({
    page,
    data,
  }) => {
    void data;
    const search = new SearchPage(page);
    await search.open();
    const values = await search.hostingProviderOptionValues();
    test.skip(
      values.length === 0,
      "Aucune option d'hébergement dans le jeu de données",
    );
    await search.filterByHostingProvider(values[0]);
  });

  test("CSF-16 - filtre Tag reflété dans tag", async ({ page, data }) => {
    const tag = await data.firstTag();
    test.skip(!tag, "Aucun tag dans le jeu de données");
    const search = new SearchPage(page);
    await search.open();
    await search.filterByTag(tag!.name);
  });

  test("CSF-17 - filtre Direction de métier reflété dans businessDivisionId", async ({
    page,
    data,
  }) => {
    const bd = await data.firstBusinessDivision();
    test.skip(!bd, "Aucune direction de métier dans le jeu de données");
    const search = new SearchPage(page);
    await search.open();
    await search.filterByBusinessDivision(bd!.label);
  });

  test("CSF-18 - filtre Relations : cible reflétée dans relationAppId", async ({
    page,
    data,
  }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");
    const search = new SearchPage(page);
    await search.open();
    await search.filterByRelationTarget(app!.label.slice(0, 4));
  });
});
