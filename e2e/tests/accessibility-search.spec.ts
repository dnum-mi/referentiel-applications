import { test, expect } from "../fixtures/test";
import type { AppRef } from "../fixtures/datafeature";
import { loginAs } from "../pom/auth";
import { AccessibilitySearchPage } from "../pom/accessibility-search.page";

test("RGA-22 — les filtres ont des noms courts et des aides décrites hors labels et légendes", async ({
  page,
}) => {
  await loginAs(page, "admin");
  const search = new AccessibilitySearchPage(page);
  await search.open();
  await search.expectConciseFilterNamesAndDescriptions();
});

test("RGA-23 — les trois champs à suggestions expliquent leur seuil et se sélectionnent au clavier", async ({
  page,
  data,
  browserName,
}) => {
  const application = await data.applicationByLabel("QA-GROUP-PARENT");
  const division = await data.firstBusinessDivision();
  expect(application, "La fixture QA-GROUP-PARENT est requise").not.toBeNull();
  expect(division, "Une direction métier réelle est requise").not.toBeNull();
  if (!application || !division)
    throw new Error("Fixtures de suggestions absentes");
  expect(division.label.length).toBeGreaterThanOrEqual(3);
  const tag = await data.createTag(`E2E-RGA23-${browserName}-${Date.now()}`);
  expect(
    tag,
    "Le tag nécessaire au parcours doit être créé par l’API",
  ).not.toBeNull();
  if (!tag) throw new Error("Création du tag impossible");
  try {
    const search = new AccessibilitySearchPage(page);
    await search.open();
    await search.expectSuggestionInstructionsAndKeyboardSelection({
      application,
      division,
      tag,
    });
  } finally {
    expect
      .soft(
        await data.deleteTag(tag.id),
        "Le tag du parcours doit être nettoyé",
      )
      .toBe(true);
  }
});

test("RGA-24 — une recherche sans résultat annonce zéro, garde le focus et permet de reprendre", async ({
  page,
  data,
}) => {
  const application = await data.applicationByLabel("QA-GROUP-PARENT");
  expect(
    application,
    "La fixture QA-GROUP-PARENT est requise pour la reprise",
  ).not.toBeNull();
  if (!application) throw new Error("Fixture QA-GROUP-PARENT absente");
  const search = new AccessibilitySearchPage(page);
  await search.open();
  await search.expectEmptySearchKeepsFocusAndRecovers(
    application,
    `E2E-RGA24-absent-${crypto.randomUUID()}`,
  );
});

test("RGA-25 — le tableau expose ses en-têtes, son tri clavier et les annonces de pagination sans perdre le focus", async ({
  page,
  data,
  browserName,
}) => {
  const prefix = `E2E-RGA25-${browserName}-${Date.now()}`;
  const applications: AppRef[] = [];
  try {
    for (const suffix of ["A", "B", "C", "D", "E", "F"])
      applications.push(
        await data.createTestApplication(`${prefix}-${suffix}`),
      );
    const search = new AccessibilitySearchPage(page);
    await search.expectTableSortingAndPagination(
      prefix,
      applications.map((application) => application.label),
    );
  } finally {
    for (const application of applications)
      expect
        .soft(
          await data.removeApplication(application.id),
          `Nettoyage de ${application.label}`,
        )
        .toBe(true);
  }
});

test("RGA-26 — la recherche mobile contient le focus, ferme les suggestions avant le dialogue et rend le focus", async ({
  page,
  data,
}) => {
  const application = await data.applicationByLabel("QA-GROUP-PARENT");
  expect(
    application,
    "La fixture QA-GROUP-PARENT est requise pour la recherche mobile",
  ).not.toBeNull();
  if (!application) throw new Error("Fixture QA-GROUP-PARENT absente");
  const search = new AccessibilitySearchPage(page);
  await search.open();
  await search.expectMobileSearchDialogKeyboard(application);
});
