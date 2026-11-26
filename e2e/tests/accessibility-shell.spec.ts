import { test } from "../fixtures/test";
import { AccessibilityShellPage } from "../pom/accessibility-shell.page";
import { loginAs } from "../pom/auth";
import { UserProfilePage } from "../pom/user-profile.page";

test.describe("Accessibilité — gabarit et navigation réels", () => {
  test("RGA-18 — gabarits public et connecté : titres, repères et noms accessibles", async ({
    page,
  }) => {
    const shell = new AccessibilityShellPage(page);
    await shell.useWidth(1280);
    await shell.openPublicHome();
    await shell.expectPublicReadingStructure();
    await loginAs(page, "admin");
    await shell.expectConnectedReadingStructure();
  });

  test("RGA-19 — les liens du pied de page annoncent leur destination et leur comportement", async ({
    page,
  }) => {
    const shell = new AccessibilityShellPage(page);
    await shell.openPublicHome();
    for (const width of [1280, 375]) {
      await shell.useWidth(width);
      await shell.expectFooterLinksDescribeTheirAction();
    }
  });

  test("RGA-20 — accès rapide au contenu puis navigation SPA au clavier", async ({
    page,
  }) => {
    const shell = new AccessibilityShellPage(page);
    for (const width of [1280, 375]) {
      await shell.useWidth(width);
      await shell.followContentShortcutAndPublicSpaLink();
    }
  });

  test("RGA-21 — les onglets du profil restent nommés, associés et visibles au clavier", async ({
    page,
  }) => {
    await loginAs(page, "admin");
    const shell = new AccessibilityShellPage(page);
    const profile = new UserProfilePage(page);
    for (const width of [1280, 375]) {
      await shell.useWidth(width);
      await profile.open();
      await shell.traverseProfileTabsWithKeyboard();
    }
  });
});
