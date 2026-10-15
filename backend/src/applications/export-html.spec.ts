import { convert } from "html-to-text";
import { createApplicationsHtml } from "./export-html";
import { createProductHtml } from "./product-html";
import { safeExportLink } from "src/utils/export.util";
import type { ProductCard } from "./product-export.service";

describe("Versions HTML des exports", () => {
  it("préserve les colonnes et chaque ligne, échappe le contenu et ne crée que des liens HTTP(S)", () => {
    const longText = "MotTrèsLong😀".repeat(400);
    const html = createApplicationsHtml([
      {
        name: "Données <test>",
        columns: [
          { key: "description", header: "Description" },
          { key: "externalRessource.link", header: "Lien" },
        ],
        rows: [
          {
            description: `${longText}<script>alert(1)</script>`,
            "externalRessource.link": 'https://example.test/?a=1&b="test"',
            secret: "EXTRA_NON_EXPORTÉ",
          },
          {
            description: "Deuxième ligne",
            "externalRessource.link": "javascript:alert(1)",
          },
          {
            description: "Troisième ligne",
            "externalRessource.link": "data:text/html,<script>",
          },
        ],
      },
    ]).toString("utf-8");
    expect(html).toContain('<html lang="fr">');
    expect(html).toContain("<main");
    expect(html).toContain("<caption>Données &lt;test&gt; — ligne 3</caption>");
    expect(html).toContain('<th scope="row">Description</th>');
    expect(html).toContain('<th scope="col">Valeur</th>');
    expect(html).not.toContain("<script>");
    expect(html).not.toMatch(/href="(?:javascript|data):/);
    expect(html).not.toContain("EXTRA_NON_EXPORTÉ");
    expect(convert(html, { wordwrap: false })).toContain(longText);
    expect(convert(html)).toContain("javascript:alert(1)");
    expect(html).toContain("&amp;b=%22test%22");
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html,x",
    "/relative",
    "mailto:a@example.test",
    "https://[",
    "",
  ])('garde le lien non HTTP(S) "%s" comme du texte', (value) => {
    expect(safeExportLink(value)).toBeUndefined();
  });

  it("garde les informations générales complètes, y compris zéro, et exclut les champs privés", () => {
    const product = {
      id: "app-1",
      label: "Produit & <A>",
      shortName: null,
      description: "Description complète\n".repeat(90),
      purposes: ["But A", "But B"],
      targetPopulations: ["Agents"],
      type: null,
      quality: 0,
      currentStatus: null,
      businessDivisions: [],
      labels: [],
      tags: [],
      actors: [{ email: "SECRET_CONTACT" }],
      technicalDebtInfo: { description: "SECRET_DETTE" },
    } satisfies ProductCard & {
      actors: { email: string }[];
      technicalDebtInfo: { description: string };
    };
    const html = createProductHtml(product).toString("utf-8");
    expect(html).toContain("0 %");
    expect(html).toContain("Non renseigné");
    expect(html).toContain(product.description);
    expect(html).toContain("Produit &amp; &lt;A&gt;");
    expect(html).not.toContain("SECRET_CONTACT");
    expect(html).not.toContain("SECRET_DETTE");
    expect(html).toContain("But A\nBut B");
  });
});
