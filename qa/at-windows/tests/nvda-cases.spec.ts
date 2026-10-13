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
      /\b(?:graphique|image)\b/u.test(entry.text);
    const image = await captureStep(
      nvda,
      "graphic-reading",
      async () => {
        await nvda.perform(
          startsOnGraphic
            ? nvda.keyboardCommands.readLine
            : nvda.keyboardCommands.moveToNextGraphic,
          {
            capture: true,
          },
        );
        // Browse-mode quick navigation can omit an object's description.
        // NVDA's native report-current-object command reads that description.
        await nvda.perform(nvda.keyboardCommands.reportCurrentObject, {
          capture: true,
        });
      },
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

function oracleRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Objet attendu dans l’oracle documentaire.");
  return value as Record<string, unknown>;
}

function oracleArray(value: unknown) {
  if (!Array.isArray(value))
    throw new Error("Liste attendue dans l’oracle documentaire.");
  return value as unknown[];
}

function oracleString(value: unknown) {
  if (typeof value !== "string")
    throw new Error("Texte attendu dans l’oracle documentaire.");
  return value;
}

function oracleStrings(value: unknown) {
  return oracleArray(value).map(oracleString);
}

function oracleField(value: unknown) {
  const field = oracleRecord(value);
  const label = oracleString(field.label);
  const candidates = oracleStrings(field.nativeTextCandidates);
  if (!candidates.length)
    throw new Error(`Aucun candidat vocal complet pour ${label}.`);
  return {
    label,
    value: oracleString(field.value),
    candidates,
    labelCandidates:
      field.labelNativeCandidates === undefined
        ? [label]
        : oracleStrings(field.labelNativeCandidates),
  };
}

function parseDocumentOracle(value: unknown) {
  const oracle = oracleRecord(value);
  return {
    requiredNativeText: oracleStrings(oracle.requiredNativeText),
    blocks: oracleArray(oracle.blocks).map(oracleField),
    emptySections: oracleArray(oracle.emptySections).map((value) => {
      const section = oracleRecord(value);
      return {
        title: oracleString(section.title),
        headers: oracleStrings(section.headers),
      };
    }),
    tables: oracleArray(oracle.tables).map((value) => {
      const table = oracleRecord(value);
      const headers = oracleStrings(table.columnHeaders);
      const headerCandidates = oracleArray(
        table.columnHeaderNativeCandidates,
      ).map(oracleStrings);
      const rows = oracleArray(table.rows).map(oracleField);
      if (headers.length !== 2 || headerCandidates.length !== 2 || !rows.length)
        throw new Error(
          "Le modèle synthétique doit décrire deux colonnes et ses lignes.",
        );
      return {
        caption: oracleString(table.caption),
        headers,
        headerCandidates,
        rows,
      };
    }),
  };
}

function nativeValuePresent(nativeText: string, expected: string) {
  const escaped = normalizeSpeech(expected).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
  if (!escaped) return false;
  return new RegExp(`(?:^|\\s)${escaped}(?=$|\\s)`, "u").test(nativeText);
}

/** Relie chaque attente à une vraie ligne/cellule annoncée, sans texte DOM. */
function contextualNativeData(
  phrases: string[],
  oracle: ReturnType<typeof parseDocumentOracle>,
) {
  const native = phrases.map(normalizeSpeech);
  const tables = oracle.tables.map((table, tableIndex) => {
    const caption = normalizeSpeech(table.caption);
    const start = native.findIndex((text) =>
      text.includes(`legende ${caption}`),
    );
    if (start < 0) throw new Error(`Légende non annoncée : ${table.caption}`);
    const nextCaption = oracle.tables[tableIndex + 1]?.caption;
    const end = nextCaption
      ? native.findIndex(
          (text, index) =>
            index > start &&
            text.includes(`legende ${normalizeSpeech(nextCaption)}`),
        )
      : native.length;
    if (end < 0)
      throw new Error(`Légende suivante non annoncée : ${nextCaption}`);
    const section = native.slice(start + 1, end);
    const fields = table.rows.map((field, index) => {
      const rowNumber = index + 2;
      const leftMarkers = table.headerCandidates[0].map((header) =>
        normalizeSpeech(`${header} colonne 1 ${field.label}`),
      );
      const left = section.findIndex(
        (text) =>
          text.includes(`ligne ${rowNumber} `) &&
          leftMarkers.some((marker) => text.includes(marker)),
      );
      if (left < 0)
        throw new Error(
          `En-tête de ligne non annoncé : ${table.caption}/${field.label}`,
        );
      const nextRow = section.findIndex(
        (text, position) =>
          position > left && text.startsWith(`ligne ${rowNumber + 1} `),
      );
      const row = section.slice(left + 1, nextRow < 0 ? undefined : nextRow);
      const rightMarkers = table.headerCandidates[1].map((header) =>
        normalizeSpeech(`${header} colonne 2`),
      );
      const right = row.findIndex((text) =>
        rightMarkers.some((marker) => text.includes(marker)),
      );
      if (right < 0)
        throw new Error(
          `Colonne de valeur non annoncée : ${table.caption}/${field.label}`,
        );
      const marker = rightMarkers.find((candidate) =>
        row[right].includes(candidate),
      );
      if (marker === undefined) throw new Error("Marqueur de cellule absent.");
      const continuation = [];
      for (const text of row.slice(right + 1)) {
        if (
          /^(?:hors de|titre |region |information sur|ligne \d+ |tableau )/u.test(
            text,
          )
        )
          break;
        continuation.push(text);
      }
      const cellText = [
        row[right].slice(row[right].indexOf(marker) + marker.length),
        ...continuation,
      ]
        .join(" ")
        .trim();
      const present =
        field.value === ""
          ? cellText === ""
          : field.candidates.some((candidate) =>
              nativeValuePresent(cellText, candidate),
            );
      return {
        row: rowNumber,
        label: field.label,
        expectedValue: field.value,
        cellText,
        present,
      };
    });
    return { caption: table.caption, fields };
  });
  const blocks = oracle.blocks.map((block, index) => {
    const start = native.findIndex((text) =>
      block.labelCandidates.some((candidate) =>
        text.includes(normalizeSpeech(candidate)),
      ),
    );
    if (start < 0) throw new Error(`Champ non annoncé : ${block.label}`);
    const next = oracle.blocks[index + 1];
    const end = next
      ? native.findIndex(
          (text, position) =>
            position > start &&
            next.labelCandidates.some((candidate) =>
              text.includes(normalizeSpeech(candidate)),
            ),
        )
      : native.length;
    if (end < 0) throw new Error(`Champ suivant non annoncé : ${next?.label}`);
    const text = native.slice(start, end).join(" ");
    return {
      label: block.label,
      expectedValue: block.value,
      nativeText: text,
      present: block.candidates.some((candidate) =>
        nativeValuePresent(text, candidate),
      ),
    };
  });
  const emptySections = oracle.emptySections.map((section) => {
    const title = normalizeSpeech(section.title);
    const start = native.findIndex((text) =>
      text.includes(`titre niveau 2 ${title} (0 lignes)`),
    );
    if (start < 0)
      throw new Error(`Section vide non annoncée : ${section.title}`);
    const next = native.findIndex(
      (text, position) => position > start && text.includes("titre niveau 2"),
    );
    const text = native.slice(start, next < 0 ? undefined : next).join(" ");
    return {
      title: section.title,
      headers: section.headers.map((header) => ({
        header,
        present: nativeValuePresent(text, header),
      })),
      emptyMessagePresent: text.includes("aucune ligne"),
      nativeText: text,
    };
  });
  return { tables, blocks, emptySections };
}

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
    const footer =
      document.id === "AT-D03"
        ? "ce rapport conserve les donnees et le journal de l import"
        : "les informations reproduisent le perimetre du format correspondant";
    const reading = await captureStep(
      nvda,
      "document-linear-reading",
      async () => {
        await focusDocumentStart(page, nvda);
        // NVDA Say All can pause longer than the SDK's one-second capture
        // window. Read each line natively until the generator's real footer.
        let reachedFooter = false;
        let previousLine = "";
        let repeatedLines = 0;
        for (let line = 0; line < 450; line++) {
          await nvda.press("ArrowDown", { capture: true });
          const currentLine = normalizeSpeech(await nvda.lastSpokenPhrase());
          if (currentLine.includes(footer)) {
            reachedFooter = true;
            break;
          }
          repeatedLines = currentLine === previousLine ? repeatedLines + 1 : 0;
          previousLine = currentLine;
          if (repeatedLines >= 6) break;
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
    const oracle = parseDocumentOracle(
      JSON.parse(await readFile(oraclePath, "utf8")),
    );
    for (const value of oracle.requiredNativeText) {
      // NVDA's real French synthesizer expands email punctuation in speak events
      // (observed: "agent-rgaa arobase example point invalid"). Keep every value,
      // accepting its literal text or that exact spoken punctuation equivalent.
      const expected = [normalizeSpeech(String(value))];
      if (String(value).includes("@"))
        expected.push(
          normalizeSpeech(
            String(value)
              .replaceAll("@", " arobase ")
              .replaceAll(".", " point "),
          ),
        );
      // The native output on 38420957659 reads the product name "Ref App".
      // Preserve the complete value, accepting only that observed word split.
      if (String(value).includes("RefApp"))
        expected.push(
          normalizeSpeech(String(value).replaceAll("RefApp", "Ref App")),
        );
      expect(
        expected.some((candidate) => reading.text.includes(candidate)),
        `Valeur réellement annoncée par NVDA : ${String(value)}`,
      ).toBe(true);
    }
    const contextual = contextualNativeData(reading.phrases, oracle);
    await info.attach("complete-contextual-native-data", {
      body: Buffer.from(JSON.stringify(contextual, null, 2)),
      contentType: "application/json",
    });
    for (const table of contextual.tables)
      for (const field of table.fields)
        expect(
          field.present,
          `Valeur complète ${table.caption}/${field.label}`,
        ).toBe(true);
    for (const block of contextual.blocks)
      expect(block.present, `Valeur complète ${block.label}`).toBe(true);
    for (const section of contextual.emptySections) {
      expect(section.emptyMessagePresent).toBe(true);
      for (const header of section.headers)
        expect(
          header.present,
          `Champ de la section vide ${section.title}/${header.header}`,
        ).toBe(true);
    }
    if (oracle.tables.length) {
      await focusDocumentStart(page, nvda);
      for (const [index, table] of oracle.tables.entries()) {
        const entry = await captureStep(
          nvda,
          `table-${index + 1}-entry`,
          async () => {
            await nvda.perform(nvda.keyboardCommands.moveToNextTable, {
              capture: true,
            });
            // Native table quick navigation stops on <caption>. Enter the first
            // header cell before issuing commands that require a table cell.
            await nvda.press("ArrowDown", { capture: true });
          },
          info,
        );
        expect(entry.text).toContain(normalizeSpeech(table.caption));
        const row = await captureStep(
          nvda,
          `table-${index + 1}-first-data-row`,
          () =>
            nvda.perform(nvda.keyboardCommands.moveToNextRow, {
              capture: true,
            }),
          info,
        );
        expect(nativeValuePresent(row.text, table.rows[0].label)).toBe(true);
        const cell = await captureStep(
          nvda,
          `table-${index + 1}-value-header-association`,
          () =>
            nvda.perform(nvda.keyboardCommands.moveToNextColumn, {
              capture: true,
            }),
          info,
        );
        expect(cell.text).not.toContain("pas dans une cellule de tableau");
        expect(
          table.headerCandidates[1].some((header) =>
            cell.text.includes(normalizeSpeech(header)),
          ),
        ).toBe(true);
        expect(
          table.rows[0].candidates.some((value) =>
            nativeValuePresent(cell.text, value),
          ),
          `Valeur du premier champ : ${table.caption}`,
        ).toBe(true);
      }
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
