import JSZip from "jszip";
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
    paths.map((path) => zip.file(path)!.async("string")),
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
      .filter((xml) => /<a:t>Description(?: \(suite\))?<\/a:t>/.test(xml))
      .flatMap((xml) => readText(xml).slice(1, -1))
      .join("");
    expect(descriptionDetails.replace(/\s+/g, "")).toBe(
      description.replace(/\s+/g, ""),
    );
    expect(text.replace(/\s+/g, "")).toContain(alias);
    // Une référence à une partie absente déclenche la réparation du fichier
    // dans PowerPoint, même si certains outils arrivent à le rendre.
    const zip = await JSZip.loadAsync(buffer);
    const contentTypes = await zip.file("[Content_Types].xml")!.async("string");
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
