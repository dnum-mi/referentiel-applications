import { chromium } from "@playwright/test";
import { ApiClient } from "../fixtures/api-client";
import { loginAs } from "../pom/auth";
import { BASE_URL } from "./helpers";
import { verifyRequiredFixtures } from "./required-fixtures";

/** Vérifier les prérequis sans supprimer les données d'une autre campagne en cours. */
export default async function accessibilitySetup(): Promise<void> {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ baseURL: BASE_URL });
    const page = await context.newPage();
    await loginAs(page, "admin");
    await verifyRequiredFixtures(await ApiClient.fromPage(page));
  } finally {
    await browser.close();
  }
}
