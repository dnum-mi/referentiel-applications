import JSZip from "jszip";
import pptxgen from "pptxgenjs";
import type { ProductCard } from "./product-export.service";
import { createProductPowerpoint } from "./product-powerpoint";

const product = {
  id: "c3468375-b116-48ea-b763-72e007b13a4c",
  label: "Référentiel des applications",
  shortName: "RefApp",
  description: "Décrire et partager les applications du ministère.",
  purposes: ["Améliorer la qualité des données", "Faciliter le pilotage"],
  targetPopulations: ["Équipes métier", "Équipes techniques"],
  type: "business",
  currentStatus: { status: "in_production" },
  quality: 85,
  businessDivisions: [{ label: "Direction numérique" }],
  labels: [{ value: "Référentiel applicatif" }],
  tags: [{ name: "Pilotage" }],
} satisfies ProductCard;

async function readSlides(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const paths = Object.keys(zip.files)
    .filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  const slides = await Promise.all(
    paths.map((path) => zip.file(path).async("string")),
  );
  const text = slides.flatMap(readText).join("\n");
  return { slides, text };
}

function readText(xml: string) {
  return Array.from(xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g), ([, text]) =>
    text
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&"),
  );
}

describe("Fiche produit PowerPoint (#434)", () => {
  it("donne un titre natif à chaque diapositive, une langue française et des identifiants uniques", async () => {
    const buffer = await createProductPowerpoint({
      ...product,
      description: "Texte détaillé à conserver. ".repeat(80),
    });
    const zip = await JSZip.loadAsync(buffer);
    const { slides } = await readSlides(buffer);
    expect(slides.length).toBeGreaterThan(1);
    const titles = slides.map((xml) => readText(xml)[0]);
    expect(new Set(titles).size).toBe(titles.length);
    for (const xml of slides) {
      const firstShape = /<p:sp>.*?<\/p:sp>/s.exec(xml)?.[0];
      expect(firstShape).toMatch(/<p:ph[^>]*type="title"/);
      expect(firstShape).toContain("<a:t>");
      const ids = Array.from(
        xml.matchAll(/<p:cNvPr id="(\d+)"/g),
        ([, id]) => id,
      );
      expect(new Set(ids).size).toBe(ids.length);
      const languages = Array.from(
        xml.matchAll(/(?:<a:rPr|<a:endParaRPr)[^>]*\blang="([^"]+)"/g),
        ([, lang]) => lang,
      );
      expect(languages.length).toBeGreaterThan(0);
      expect(new Set(languages)).toEqual(new Set(["fr-FR"]));
    }
    const notes = Object.keys(zip.files).filter((path) =>
      /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(path),
    );
    for (const path of notes) {
      const xml = await zip.file(path).async("string");
      expect(xml).toContain("Source : informations générales");
      expect(xml).not.toContain('lang="en-US"');
      expect(xml).toContain('lang="fr-FR"');
    }
  });

  it("conserve des IDs distincts avec plusieurs tables et garde l'anglais par défaut hors RefApp", async () => {
    const presentation = new pptxgen();
    const slide = presentation.addSlide();
    slide.addText("Title", { x: 0, y: 0, w: 4, h: 1 });
    slide.addTable([[{ text: "One" }]], { x: 0, y: 1, w: 4, h: 1 });
    slide.addTable([[{ text: "Two" }]], { x: 0, y: 2, w: 4, h: 1 });
    slide.addNotes("Notes in English");
    const buffer = await presentation.write({ outputType: "nodebuffer" });
    if (!Buffer.isBuffer(buffer)) throw new Error("PPTX attendu");
    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.file("ppt/slides/slide1.xml").async("string");
    const ids = Array.from(
      xml.matchAll(/<p:cNvPr id="(\d+)"/g),
      ([, id]) => id,
    );
    expect(new Set(ids).size).toBe(ids.length);
    expect(
      await zip.file("ppt/notesSlides/notesSlide1.xml").async("string"),
    ).toContain('lang="en-US"');
  });

  it("génère une fiche modifiable avec les informations générales et la date", async () => {
    const buffer = await createProductPowerpoint(
      product,
      new Date("2026-10-06T22:30:00Z"),
    );
    const { slides, text } = await readSlides(buffer);
    expect(slides).toHaveLength(1);
    expect(slides[0]).toContain("<a:tbl>");
    expect(slides[0]).not.toContain("<p:pic>");
    for (const value of [
      product.id,
      product.label,
      product.shortName,
      product.description,
      ...product.purposes,
      ...product.targetPopulations,
      "Direction numérique",
      "Référentiel applicatif",
      "Pilotage",
      "En production",
      "85 %",
      "07/10/2026",
    ]) {
      expect(text.replace(/\s+/g, " ")).toContain(value.replace(/\s+/g, " "));
    }
  });

  it("conserve les textes longs et les mots sans espace dans les détails", async () => {
    const description = `${"Phrase descriptive. ".repeat(100)}FIN_DESCRIPTION`;
    const alias = `${"éW😀".repeat(100)}FIN_ALIAS`;
    const buffer = await createProductPowerpoint({
      ...product,
      description,
      labels: [{ value: alias }],
    });
    const { slides, text } = await readSlides(buffer);
    expect(slides.length).toBeGreaterThan(1);
    expect(text).toContain("voir détails");
    const descriptionDetails = slides
      .filter((xml) => /^Description(?: \(\d+\/\d+\))?$/.test(readText(xml)[0]))
      .flatMap((xml) => readText(xml).slice(1, -1))
      .join("");
    expect(descriptionDetails.replace(/\s+/g, "")).toBe(
      description.replace(/\s+/g, ""),
    );
    expect(text.replace(/\s+/g, "")).toContain(alias);
    // Une référence à une partie absente déclenche la réparation du fichier
    // dans PowerPoint, même si certains outils arrivent à le rendre.
    const zip = await JSZip.loadAsync(buffer);
    const contentTypes = await zip.file("[Content_Types].xml").async("string");
    for (const [, part] of contentTypes.matchAll(/PartName="\/([^"]+)"/g)) {
      expect(zip.file(part)).not.toBeNull();
    }
  });

  it("distingue un IQ nul de zéro et exclut les données privées même présentes en entrée", async () => {
    const source = {
      ...product,
      shortName: null,
      currentStatus: null,
      quality: null,
      businessDivisions: [],
      labels: [],
      tags: [],
      technicalDebtInfo: { description: "DETTE_CONFIDENTIELLE" },
      actors: [{ email: "contact-confidentiel@example.test" }],
    };
    const { text } = await readSlides(await createProductPowerpoint(source));
    expect(text).toContain("Non renseigné");
    expect(text).not.toContain("0 %");
    expect(text).not.toContain("DETTE_CONFIDENTIELLE");
    expect(text).not.toContain("contact-confidentiel@example.test");
    const zero = await readSlides(
      await createProductPowerpoint({ ...source, quality: 0 }),
    );
    expect(zero.text).toContain("0 %");
  });
});
