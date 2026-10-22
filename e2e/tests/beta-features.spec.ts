import { readFile } from "node:fs/promises";
import type { Download } from "@playwright/test";
import { createIsolatedBetaTester } from "../fixtures/beta-tester";
import { test, expect } from "../fixtures/test";
import { ApplicationPage, SearchPage } from "../pom";

async function saveDownload(
  download: Download,
  name: string | RegExp,
  contentType: string,
) {
  expect(await download.failure()).toBeNull();
  if (typeof name === "string") expect(download.suggestedFilename()).toBe(name);
  else expect(download.suggestedFilename()).toMatch(name);
  const artifactName =
    typeof name === "string" ? name : "applications_export.xlsx";
  const path = test.info().outputPath(artifactName);
  await download.saveAs(path);
  const content = await readFile(path);
  expect(content.length).toBeGreaterThan(100);
  await test.info().attach(artifactName, { path, contentType });
  return content;
}

test.describe("Fonctionnalités bêta — délégation explicite", () => {
  test("BET-01 - badges et vrais exports, puis retrait de la capacité avant téléchargement", async ({
    page,
    data,
  }) => {
    const application = await data.firstApplication();
    expect(application, "Application de qualification absente").toBeTruthy();
    const tester = await createIsolatedBetaTester(page, data);
    try {
      await tester.setPermissions(["DataExport"]);
      await tester.impersonate();
      const search = new SearchPage(page);
      const fiche = new ApplicationPage(page);
      await search.open();
      await search.expectExcelBetaExport(false);
      await search.expectStableHtmlExportVisible();
      await fiche.open(application!.id);
      await fiche.expectProductBetaExports(false);

      await tester.setPermissions(["DataExport", "BetaFeatures"]);
      await fiche.open(application!.id);
      await fiche.expectProductBetaExports(true);
      await test.info().attach("beta-product-desktop", {
        body: await page.screenshot({ fullPage: true }),
        contentType: "image/png",
      });
      const html = await saveDownload(
        await fiche.exportProduct("html"),
        `fiche-produit-${application!.id}.html`,
        "text/html",
      );
      expect(html.toString("utf8")).toContain('<html lang="fr">');
      expect(html.toString("utf8")).toContain(application!.id);
      const powerpoint = await saveDownload(
        await fiche.exportProduct("powerpoint"),
        `fiche-produit-${application!.id}.pptx`,
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      );
      expect(powerpoint.subarray(0, 4).toString("hex")).toBe("504b0304");

      await search.open();
      await search.expectExcelBetaExport(true);
      const excel = await saveDownload(
        await search.exportExcel(),
        /^applications_export_\d{4}-\d{2}-\d{2}\.xlsx$/,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      expect(excel.subarray(0, 4).toString("hex")).toBe("504b0304");

      // L'interface reste ouverte : le clic doit relire l'habilitation retirée
      // et ne déclencher ni requête d'export ni événement de téléchargement.
      await tester.setPermissions(["DataExport"]);
      await search.expectExcelRevocationBeforeDownload();
      await search.expectStableHtmlExportVisible();
      await fiche.open(application!.id);
      await fiche.expectProductBetaExports(false);
    } finally {
      await tester.dispose();
    }
  });

  test("BET-02 - le bouton mobile affiche le badge et télécharge, puis disparaît sans la capacité bêta", async ({
    page,
    data,
  }) => {
    const application = await data.firstApplication();
    expect(application, "Application de qualification absente").toBeTruthy();
    const tester = await createIsolatedBetaTester(page, data);
    try {
      await tester.setPermissions(["DataExport", "BetaFeatures"]);
      await tester.impersonate();
      await page.setViewportSize({ width: 375, height: 812 });
      const search = new SearchPage(page);
      await search.open();
      await search.expectExcelBetaExport(true, true);
      await test.info().attach("beta-catalogue-mobile", {
        body: await page.screenshot({ fullPage: true }),
        contentType: "image/png",
      });
      const excel = await saveDownload(
        await search.exportExcel({ mobile: true }),
        /^applications_export_\d{4}-\d{2}-\d{2}\.xlsx$/,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      expect(excel.subarray(0, 4).toString("hex")).toBe("504b0304");
      const fiche = new ApplicationPage(page);
      await fiche.open(application!.id);
      await fiche.expectProductBetaExports(true);

      await tester.setPermissions(["DataExport"]);
      await fiche.open(application!.id);
      await fiche.expectProductBetaExports(false);
      await search.open();
      await search.expectExcelBetaExport(false, true);
      await search.expectStableHtmlExportVisible();
    } finally {
      await tester.dispose();
    }
  });
});
