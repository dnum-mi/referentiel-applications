import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type Page, type TestInfo } from "@playwright/test";

// Chemin ABSOLU (résolu depuis ce fichier = `e2e/support/`), indépendant du `process.cwd()` des
// workers Playwright, pour que toutes les captures atterrissent dans le même `e2e/qa-screenshots`.
export const SCREENSHOTS_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../qa-screenshots",
);

const STEP_ID = /\b([A-Z]{3}-\d+)\b/;

/**
 * Capture un screenshot nommé par l'ID d'étape (extrait du titre du test), ex. `CAT-02.png`.
 * Appelée par la fixture auto `screenshotPerStep` après chaque test : produit la pièce jointe
 * attendue par `qa/scripts/sync-issue.mjs`. Ne capture pas les tests skippés ni sans ID d'étape.
 */
export async function captureStepScreenshot(
  page: Page,
  testInfo: TestInfo,
): Promise<void> {
  const id = STEP_ID.exec(testInfo.title)?.[1];
  if (!id || testInfo.status === "skipped") return;
  const path = `${SCREENSHOTS_DIR}/${id}.png`;
  // `fullPage` peut échouer sur des pages longues/instables (surtout en CI) → repli sur une capture
  // viewport pour ne jamais perdre la preuve d'étape. Le timeout évite tout blocage en fin de test.
  try {
    await page.screenshot({ path, fullPage: true, timeout: 15000 });
  } catch {
    await page.screenshot({ path, timeout: 15000 }).catch(() => {});
  }
}
