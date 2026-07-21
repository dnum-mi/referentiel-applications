import { test as base } from "@playwright/test";
import { loginAs } from "../pom/auth";
import { captureStepScreenshot } from "../support/screenshots";
import { ApiClient } from "./api-client";
import { DataFeature } from "./datafeature";

export interface Fixtures {
  /**
   * Datafeature exécutée AVANT chaque test qui la consomme : connecte l'acteur par défaut (`admin`)
   * puis fournit des résolveurs de données API pour le protocole.
   *
   * Les tests nécessitant un autre rôle (ex. `user`) ne consomment pas cette fixture et appellent
   * `loginAs(page, "user")` eux-mêmes.
   */
  data: DataFeature;
  /** Fixture auto (interne) : capture un screenshot par étape après chaque test. */
  screenshotPerStep: void;
}

export const test = base.extend<Fixtures>({
  data: async ({ page }, use) => {
    await loginAs(page, "admin");
    const api = await ApiClient.fromPage(page);
    const dataFeature = new DataFeature(api);
    await use(dataFeature);
    // Filet de sécurité : les feature flags sont un état serveur GLOBAL. Ce
    // teardown restaure les flags touchés même si le test a timeouté (cas où
    // un `finally` de corps de test ne s'exécute pas).
    await dataFeature.restoreFeatureFlags();
  },

  // Fixture AUTO plutôt qu'un `test.afterEach` : un afterEach défini dans ce module partagé n'est
  // enregistré qu'au 1ᵉʳ fichier qui importe le module (cache ESM) → les specs suivantes du même
  // worker Playwright ne le déclenchaient pas (les captures SIG disparaissaient en CI). Une fixture
  // auto s'exécute, elle, pour CHAQUE test consommant ce `test`, quel que soit le fichier.
  screenshotPerStep: [
    async ({ page }, use) => {
      await use();
      await captureStepScreenshot(page, test.info());
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
