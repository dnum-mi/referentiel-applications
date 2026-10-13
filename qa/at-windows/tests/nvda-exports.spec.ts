import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { expect } from "@playwright/test";
import {
  test,
  attachIdentity,
  captureStep,
  focusDocumentStart,
  normalizeSpeech,
} from "./fixture.js";
import { activateCurrent, tabTo } from "./native-utils.js";
import {
  finishExports,
  mountExportScene,
  simulatedExportsNetwork,
} from "./exports-swagger-utils.js";

test.use({ serviceWorkers: "block" });
test.beforeEach(async ({}, info) => {
  info.setTimeout(420_000);
  info.annotations.push({
    type: "RGAA",
    description:
      "7.1.2 — U19/U21 ciblés, composants réels, données synthétiques ; aucun Execute/OAuth soumis et aucune clôture globale",
  });
});

const exportCases = [
  {
    id: "catalogue-excel",
    scene: "catalogue",
    button: "application-export-btn",
    name: "Exporter en Excel",
    file: "synthetic-catalogue.xlsx",
    pending: "Préparation de l’export Excel",
    error:
      "Une erreur est survenue lors de l'exportation Excel. Veuillez réessayer.",
  },
  {
    id: "catalogue-html",
    scene: "catalogue",
    button: "applications-export-html-btn",
    name: "Exporter en HTML",
    file: "AT-D01.html",
    pending: "Préparation de l’export HTML",
    error:
      "Une erreur est survenue lors de l'exportation HTML. Veuillez réessayer.",
  },
  {
    id: "catalogue-excel-mobile",
    scene: "catalogue",
    button: "application-export-btn-mobile",
    name: "Exporter en Excel",
    file: "synthetic-catalogue.xlsx",
    pending: "Préparation de l’export Excel",
    error:
      "Une erreur est survenue lors de l'exportation Excel. Veuillez réessayer.",
    mobile: true,
  },
  {
    id: "product-powerpoint",
    scene: "product",
    button: "application-export-powerpoint-btn",
    name: "Exporter la fiche produit en PowerPoint",
    file: "synthetic-product.pptx",
    pending: "Préparation du PowerPoint",
    error:
      "Impossible d'exporter la fiche produit en PowerPoint. Veuillez réessayer.",
  },
  {
    id: "product-html",
    scene: "product",
    button: "application-export-html-btn",
    name: "Exporter la fiche produit en HTML",
    file: "AT-D02.html",
    pending: "Préparation de la fiche HTML",
    error:
      "Impossible d'exporter la fiche produit en HTML. Veuillez réessayer.",
  },
] as const;

for (const current of exportCases) {
  test(`AT-INT-U21-${current.id} — attente, erreur native puis réessai et fichier exact`, async ({
    page,
    browser,
    nvda,
  }, info) => {
    const network = await simulatedExportsNetwork(page);
    try {
      if ("mobile" in current)
        await page.setViewportSize({ width: 375, height: 900 });
      await page.goto(network.base);
      await mountExportScene(page, current.scene);
      await attachIdentity(nvda, browser.version(), info);
      await focusDocumentStart(page, nvda);
      const focused = await tabTo(nvda, current.name, info);
      expect(focused.text).toContain("bouton");
      const button = page.getByTestId(current.button);
      await expect(button).toBeFocused();
      const waiting = await activateCurrent(nvda, info, `${current.id}-start`);
      await expect.poll(() => network.pending.length).toBe(1);
      await expect(button).toHaveAttribute("aria-busy", "true");
      await expect(button).toHaveAttribute("aria-disabled", "true");
      await expect(button).toBeFocused();
      expect(waiting.text).toContain(normalizeSpeech(current.pending));
      const pendingState = await captureStep(
        nvda,
        `${current.id}-disabled-state`,
        () =>
          nvda.perform(nvda.keyboardCommands.reportCurrentFocus, {
            capture: true,
          }),
        info,
      );
      expect(pendingState.text).toContain(normalizeSpeech(current.name));
      expect(pendingState.text).toMatch(
        /indisponible|non disponible|desactive|unavailable/,
      );
      await activateCurrent(nvda, info, `${current.id}-duplicate-blocked`);
      expect(network.pending).toHaveLength(1);
      expect(
        network.exportCalls.filter(
          (call) => call.outcome === "pending-intercepted",
        ),
      ).toHaveLength(1);
      const error = await captureStep(
        nvda,
        `${current.id}-server-500`,
        async () => {
          network.release("error");
          await expect(page.getByTestId("app-toaster")).toContainText(
            current.error,
          );
          await page.waitForTimeout(1200);
        },
        info,
      );
      expect(error.text).toContain(normalizeSpeech(current.error));
      await expect(button).toBeFocused();
      await expect(button).toHaveAttribute("aria-disabled", "false");
      const returned = await captureStep(
        nvda,
        `${current.id}-return-after-error`,
        () =>
          nvda.perform(nvda.keyboardCommands.reportCurrentFocus, {
            capture: true,
          }),
        info,
      );
      expect(returned.text).toContain(normalizeSpeech(current.name));
      const downloadPromise = page.waitForEvent("download");
      await activateCurrent(nvda, info, `${current.id}-retry`);
      await expect.poll(() => network.pending.length).toBe(1);
      await captureStep(
        nvda,
        `${current.id}-download-success`,
        async () => {
          network.release("success");
          await downloadPromise;
          await expect(button).toHaveAttribute("aria-busy", "false");
        },
        info,
      );
      const download = await downloadPromise;
      const localPath = await download.path();
      if (!localPath) throw new Error("Downloaded file has no local artifact.");
      const actual = await readFile(localPath);
      const expected = await readFile(
        new URL(`../fixtures/${current.file}`, import.meta.url),
      );
      expect(actual.equals(expected)).toBe(true);
      await expect(button).toBeFocused();
      expect(network.unhandled).toEqual([]);
      await info.attach("exact-generator-download", {
        body: Buffer.from(
          JSON.stringify(
            {
              filename: download.suggestedFilename(),
              sha256: createHash("sha256").update(actual).digest("hex"),
              bytes: actual.length,
              exactFixture: true,
            },
            null,
            2,
          ),
        ),
        contentType: "application/json",
      });
      await finishExports(page, network, info);
    } finally {
      network.cancelPending();
    }
  });
}

for (const format of ["csv", "html"] as const) {
  test(`AT-INT-U21-import-report-${format} — commande locale et données exactes du vrai générateur`, async ({
    page,
    browser,
    nvda,
  }, info) => {
    const network = await simulatedExportsNetwork(page);
    try {
      await page.goto(network.base);
      await mountExportScene(page, "report");
      await attachIdentity(nvda, browser.version(), info);
      await focusDocumentStart(page, nvda);
      const name = `Télécharger le rapport ${format.toUpperCase()}`;
      expect((await tabTo(nvda, name, info)).text).toContain("bouton");
      const button = page.getByTestId(
        format === "csv"
          ? "admin-import-report-download"
          : "admin-import-report-download-html",
      );
      await expect(button).toBeFocused();
      const downloadPromise = page.waitForEvent("download");
      await activateCurrent(nvda, info, `import-report-download-${format}`);
      const download = await downloadPromise;
      const localPath = await download.path();
      if (!localPath) throw new Error("Report download has no artifact.");
      expect(
        (await readFile(localPath)).equals(
          await readFile(
            new URL(`../fixtures/AT-D03.${format}`, import.meta.url),
          ),
        ),
      ).toBe(true);
      await expect(button).toBeFocused();
      expect(network.exportCalls).toHaveLength(1);
      expect(network.exportCalls[0].outcome).toBe(
        "synthetic-import-preparation-only",
      );
      expect(network.unhandled).toEqual([]);
      await finishExports(page, network, info);
    } finally {
      network.cancelPending();
    }
  });
}
