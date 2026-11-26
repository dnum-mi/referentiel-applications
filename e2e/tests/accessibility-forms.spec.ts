import { test } from "../fixtures/test";
import { loginAs } from "../pom/auth";
import { AccessibilityFormsPage } from "../pom/accessibility-forms.page";

for (const width of [1280, 375]) {
  test.describe(`Contrats d'accessibilité des formulaires (${width}px)`, () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, "admin");
      await page.setViewportSize({ width, height: 900 });
    });

    test("RGA-27 — champs obligatoires, descriptions d'erreur et focus entre étapes", async ({
      page,
    }) => {
      await new AccessibilityFormsPage(
        page,
      ).expectCreationValidationAndStepFocus();
    });

    test("RGA-28 — annulation d'un brouillon, dialogue clavier et restitution du focus", async ({
      page,
    }) => {
      await new AccessibilityFormsPage(page).expectDirtyFormDialogFocus();
    });

    test("RGA-29 — réglages Grist, erreurs associées et premier champ invalide", async ({
      page,
    }) => {
      await new AccessibilityFormsPage(
        page,
      ).expectGristValidationDescriptions();
    });

    test("RGA-30 — historique sans résultat, annonce persistante et focus conservé", async ({
      page,
    }) => {
      await new AccessibilityFormsPage(page).expectHistoryEmptyAnnouncement();
    });

    test("RGA-31 — signalement, dialogue au clavier et annonce d'erreur", async ({
      page,
    }) => {
      await new AccessibilityFormsPage(
        page,
      ).expectReportDialogAndErrorAnnouncement();
    });
  });
}
