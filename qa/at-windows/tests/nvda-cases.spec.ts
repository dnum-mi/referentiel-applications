import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { expect } from "@playwright/test";
import {
  attachIdentity,
  captureStep,
  focusDocumentStart,
  installOfflinePage,
  normalizeSpeech,
  test,
} from "./fixture.js";

const graphics = [
  {
    id: "AT-C01",
    tests: ["1.3.8", "1.6.8"],
    name: "Répartition des applications par IQ",
    description: [
      "tranches de 5 points",
      "arrondi",
      "mêmes tranches et effectifs",
    ],
    fallback:
      "Les effectifs par tranche d’IQ sont disponibles en activant le bouton « Voir le tableau ».",
  },
  {
    id: "AT-C02",
    tests: ["1.3.8", "1.6.8"],
    name: "Nombre d'applications référencées",
    description: ["mensuelle", "mêmes mois"],
    fallback:
      "Les valeurs mensuelles sont disponibles en activant le bouton « Voir le tableau ».",
  },
  {
    id: "AT-C03",
    tests: ["1.3.8", "1.6.8"],
    name: "Évolution de l’IQ moyen",
    description: [
      "axe horizontal",
      "axe vertical",
      "pourcentage",
      "mêmes périodes et valeurs",
    ],
    fallback:
      "Les valeurs sont disponibles en activant le bouton « Voir le tableau ».",
  },
  {
    id: "AT-S01",
    tests: ["1.6.6"],
    name: "Diagramme TIME",
    description: [
      "maturité métier",
      "technique",
      "1 à 5",
      "maîtrise des coûts MCO",
      "tableau",
    ],
    fallback: null,
  },
  {
    id: "AT-S02",
    tests: ["1.6.6"],
    name: "Relations de Application fictive Alpha, profondeur 1",
    description: [
      "3 applications",
      "2 relations",
      "Application fictive Alpha utilise les données de Application fictive Bêta",
      "Majuscule",
      "flèches",
      "liste complète",
    ],
    fallback: null,
  },
  {
    id: "AT-S03",
    tests: ["1.6.6"],
    name: "Dépendance de deux applications fictives",
    description: ["Portail fictif consulte le référentiel fictif"],
    fallback: null,
  },
  {
    id: "AT-S04",
    tests: ["1.6.6"],
    name: "Diagramme : consulte, Portail fictif, Référentiel fictif",
    description: [
      "Une version textuelle du diagramme est disponible après l’image",
    ],
    fallback: null,
  },
];

for (const graphic of graphics) {
  test(`${graphic.id} — restitution native du nom, description et alternative interne`, async ({
    page,
    browser,
    nvda,
  }, info) => {
    info.annotations.push(
      { type: "RGAA", description: graphic.tests.join(", ") },
      {
        type: "scope",
        description:
          "Restitution du contenu DOM réel sous fixture synthétique ; handlers et qualification 7.1.2 exclus.",
      },
    );
    await installOfflinePage(page, graphic.id);
    await attachIdentity(nvda, browser.version(), info);
    const entry = await captureStep(
      nvda,
      "document-start",
      () => focusDocumentStart(page, nvda),
      info,
    );
    // The first SVG may itself be the document's first accessible item.
    // In that case, "next graphic" would skip the item under examination.
    const startsOnGraphic =
      entry.text.includes(normalizeSpeech(graphic.name)) &&
      entry.phrases.some((phrase) =>
        /,\s*(?:graphique|image)(?:[,.]|$)/u.test(phrase),
      );
    const image = await captureStep(
      nvda,
      "graphic-reading",
      () =>
        nvda.perform(
          startsOnGraphic
            ? nvda.keyboardCommands.readLine
            : nvda.keyboardCommands.moveToNextGraphic,
          {
            capture: true,
          },
        ),
      info,
    );
    const spokenImage = startsOnGraphic
      ? `${entry.text} ${image.text}`
      : image.text;
    expect(spokenImage).toContain(normalizeSpeech(graphic.name));
    expect(spokenImage).toMatch(/graphique|image/);
    for (const meaning of graphic.description)
      expect(spokenImage).toContain(normalizeSpeech(meaning));
    if (graphic.fallback)
      expect(spokenImage).toContain(normalizeSpeech(graphic.fallback));
    await info.attach("fixture-manifest", {
      path: fileURLToPath(
        new URL("../fixtures/manifest.json", import.meta.url),
      ),
      contentType: "application/json",
    });
    await page.screenshot({
      path: info.outputPath("scene.png"),
      fullPage: true,
    });
  });
}

const documents = [
  {
    id: "AT-D01",
    required: [
      "Export des applications",
      "Applications",
      "Acteurs",
      "Conformités",
      "Hébergements",
      "Ressources",
      "Relations sortantes",
      "Statuts",
    ],
  },
  {
    id: "AT-D02",
    required: [
      "Fiche produit",
      "Description flash",
      "Proposition de valeur",
      "Objectifs",
      "Cibles",
      "Données flash",
      "Relation client",
      "Coûts et revenus",
    ],
  },
  {
    id: "AT-D03",
    required: [
      "Rapport d’import",
      "Détail par ligne",
      "Résumé de l’import",
      "Journal d’exécution",
    ],
  },
];

for (const document of documents) {
  test(`${document.id} — lecture native de l’alternative HTML téléchargeable`, async ({
    page,
    browser,
    nvda,
  }, info) => {
    info.annotations.push(
      { type: "RGAA", description: "13.3.1" },
      {
        type: "scope",
        description:
          "Document synthétique exact du générateur courant ; lecture linéaire complète et annonces du vrai NVDA.",
      },
    );
    await installOfflinePage(page, document.id);
    await attachIdentity(nvda, browser.version(), info);
    info.setTimeout(600_000);
    const reading = await captureStep(
      nvda,
      "document-linear-reading",
      async () => {
        await focusDocumentStart(page, nvda);
        // NVDA Say All can pause longer than the SDK's one-second capture
        // window. Read each line natively until the generator's real footer.
        let reachedFooter = false;
        for (let line = 0; line < 450; line++) {
          await nvda.press("ArrowDown", { capture: true });
          if (
            normalizeSpeech(await nvda.lastSpokenPhrase()).includes(
              "les informations reproduisent le perimetre du format correspondant",
            )
          ) {
            reachedFooter = true;
            break;
          }
        }
        expect(reachedFooter, "Fin du document réellement lue par NVDA").toBe(
          true,
        );
      },
      info,
    );
    for (const phrase of document.required)
      expect(reading.text).toContain(normalizeSpeech(phrase));
    const oraclePath = new URL(
      `../fixtures/${document.id}.oracle.json`,
      import.meta.url,
    );
    const oracle: unknown = JSON.parse(await readFile(oraclePath, "utf8"));
    if (
      !oracle ||
      typeof oracle !== "object" ||
      !("requiredNativeText" in oracle) ||
      !Array.isArray(oracle.requiredNativeText) ||
      !oracle.requiredNativeText.every(
        (value: unknown) => typeof value === "string",
      )
    ) {
      throw new Error(
        `Oracle ${document.id} invalide : l’exhaustivité des données n’est pas vérifiable.`,
      );
    }
    for (const value of oracle.requiredNativeText)
      expect(reading.text).toContain(normalizeSpeech(String(value)));
    if (document.id !== "AT-D02") {
      await focusDocumentStart(page, nvda);
      const cells = await captureStep(
        nvda,
        "first-table-header-association",
        async () => {
          await nvda.perform(nvda.keyboardCommands.moveToNextTable, {
            capture: true,
          });
          await nvda.perform(nvda.keyboardCommands.moveToNextRow, {
            capture: true,
          });
          await nvda.perform(nvda.keyboardCommands.moveToNextColumn, {
            capture: true,
          });
        },
        info,
      );
      const rowLabel = document.id === "AT-D01" ? "Identifiant" : "Onglet";
      const value =
        document.id === "AT-D01" ? "app-synthetic-001" : "Acteurs synthétiques";
      for (const phrase of ["Champ", "Valeur", rowLabel, value])
        expect(cells.text).toContain(normalizeSpeech(phrase));
    }
    await info.attach("expected-document-values", {
      body: Buffer.from(JSON.stringify(oracle, null, 2)),
      contentType: "application/json",
    });
    await page.screenshot({
      path: info.outputPath("document.png"),
      fullPage: true,
    });
  });
}
