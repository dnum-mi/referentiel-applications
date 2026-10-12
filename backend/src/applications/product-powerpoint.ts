import pptxgen from "pptxgenjs";
import type { ProductCard } from "./product-export.service";
import { missingProductValue, productExportView } from "./product-export.view";

export const POWERPOINT_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

const colors = {
  blue: "000091",
  pink: "E85483",
  cyan: "00749B",
  text: "161616",
  background: "F6F6F6",
};
const missing = missingProductValue;
const language = "fr-FR";

// Largeurs prudentes pour Arial : les capitales, les emoji et les caractères
// larges occupent davantage de place qu'une lettre courante.
function textWidth(chars: string[]) {
  return chars.reduce((total, char) => {
    if (/\p{Mark}/u.test(char)) return total;
    if (/[WMwm@%Œœ]/.test(char)) return total + 1.8;
    if (/[A-ZÀ-Ý]/.test(char)) return total + 1.35;
    if (char.codePointAt(0)! > 0x024f) return total + 2;
    return total + 1;
  }, 0);
}

/** Découpe aussi les mots longs, sans couper les paires UTF-16 (emoji, etc.). */
function wrapText(text: string, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.trim().split(/\r?\n/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const chars = Array.from(word);
      if (line && textWidth(Array.from(line)) + textWidth(chars) + 1 > width) {
        lines.push(line);
        line = "";
      }
      while (textWidth(chars) > width) {
        let length = 1;
        while (textWidth(chars.slice(0, length + 1)) <= width) length++;
        lines.push(chars.splice(0, length).join(""));
      }
      line = line ? `${line} ${chars.join("")}` : chars.join("");
    }
    lines.push(line);
  }
  return lines;
}

export async function createProductPowerpoint(
  application: ProductCard,
  exportedAt = new Date(),
): Promise<Buffer> {
  const presentation = new pptxgen();
  const view = productExportView(application);
  presentation.layout = "LAYOUT_WIDE";
  presentation.author = "Référentiel des applications";
  presentation.subject = `Fiche produit ${application.id}`;
  presentation.title = application.label;
  presentation.theme = {
    headFontFace: "Arial",
    bodyFontFace: "Arial",
  };
  for (const [title, x, y, w, h] of [
    ["PRODUCT_SUMMARY", 0.35, 0.1, 9.5, 0.85],
    ["PRODUCT_DETAIL", 0.5, 0.35, 12.3, 0.65],
  ] as const) {
    presentation.defineSlideMaster({
      title,
      objects: [
        {
          placeholder: {
            options: {
              name: "title",
              type: "title",
              x,
              y,
              w,
              h,
              lang: language,
              margin: 0,
            },
          },
        },
      ],
    });
  }
  const date = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
  }).format(exportedAt);
  const source = `RefApp · ${application.id} · Export du ${date}`;
  const overflow = new Map<string, string[]>();

  // La synthèse reste lisible ; les valeurs trop longues sont conservées dans
  // des diapositives de détail, jamais simplement perdues par troncature.
  function preview(
    title: string,
    value: string,
    width: number,
    maxLines: number,
  ) {
    const lines = wrapText(value.trim() || missing, width);
    if (lines.length <= maxLines) return lines.join("\n");
    overflow.set(title, wrapText(value, 86));
    return `${lines.slice(0, maxLines - 1).join("\n")}\n… (voir détails)`;
  }

  function addFooter(slide: pptxgen.Slide) {
    slide.addText(source, {
      lang: language,
      objectName: "Source et date de l'export",
      x: 0.35,
      y: 7.12,
      w: 12.63,
      h: 0.2,
      fontSize: 9,
      color: "666666",
      margin: 0,
    });
    slide.addNotes(
      `Source : informations générales de la fiche RefApp ${application.id}, ` +
        `exportées le ${exportedAt.toISOString()}. Les métriques d'usage, la relation ` +
        "client et les coûts ne sont pas des champs de cette fiche ; aucune valeur n'est déduite.",
    );
  }

  const slide = presentation.addSlide({ masterName: "PRODUCT_SUMMARY" });
  // Les objets sont ajoutés dans l'ordre de lecture : titre, statut, faits,
  // puis chaque rubrique avec son contenu, et enfin la source.
  slide.addText(preview("Nom de l'application", view.title, 56, 2), {
    placeholder: "title",
    objectName: "Titre de la fiche produit",
    lang: language,
    x: 0.35,
    y: 0.1,
    w: 9.5,
    h: 0.85,
    fontSize: 22,
    bold: true,
    color: colors.blue,
    margin: 0,
    valign: "middle",
    breakLine: false,
  });
  slide.addText(view.status, {
    objectName: "Statut de l'application",
    lang: language,
    x: 10,
    y: 0.28,
    w: 2.98,
    h: 0.55,
    fontSize: 16,
    bold: true,
    color: colors.blue,
    align: "right",
    margin: 0,
  });

  const facts = view.facts.map(({ title, value, lines }) => [
    title,
    title === "Identifiant" ? value : preview(title, value, 29, lines),
  ]);
  slide.addText("Description flash", {
    objectName: "Titre des informations générales",
    lang: language,
    x: 0.35,
    y: 1.04,
    w: 3.05,
    h: 0.43,
    fontSize: 18,
    bold: true,
    color: "FFFFFF",
    fill: { color: colors.pink },
    margin: [4, 8, 4, 8],
  });
  slide.addTable(
    facts.map(([title, value]) => [
      {
        text: [
          {
            text: title,
            options: { bold: true, breakLine: true, lang: language },
          },
          { text: value, options: { lang: language } },
        ],
      },
    ]),
    {
      objectName: "Informations générales de l'application",
      lang: language,
      x: 0.35,
      y: 1.47,
      w: 3.05,
      h: 5.45,
      fontSize: 11,
      color: "FFFFFF",
      fill: { color: colors.blue },
      border: { type: "solid", color: colors.blue, pt: 0 },
      margin: [5, 9, 5, 9],
      valign: "top",
      autoPage: false,
    },
  );

  function addSection(
    title: string,
    text: string,
    x: number,
    y: number,
    w: number,
    h: number,
    options: { background?: string; color?: string } = {},
  ) {
    slide.addText(title, {
      objectName: title,
      lang: language,
      x,
      y,
      w,
      h: 0.42,
      fontSize: 18,
      bold: true,
      color: colors.blue,
      margin: [0, 7, 0, 7],
    });
    slide.addText(text, {
      objectName: `Contenu : ${title}`,
      lang: language,
      x,
      y: y + 0.44,
      w,
      h: h - 0.44,
      fontSize: 14,
      color: options.color ?? colors.text,
      fill: { color: options.background ?? colors.background },
      line: { color: colors.pink, width: 1 },
      margin: 8,
      valign: "top",
      paraSpaceAfter: 0,
      lineSpacingMultiple: 1,
    });
  }

  addSection(
    "Proposition de valeur",
    preview("Description", view.description, 46, 6),
    3.65,
    1.04,
    5.4,
    2.25,
  );
  addSection(
    "Objectifs",
    preview("Objectifs", view.purposes, 46, 3),
    3.65,
    3.46,
    5.4,
    1.55,
  );
  addSection(
    "Cibles & utilisateurs",
    preview("Populations cibles", view.targetPopulations, 46, 4),
    3.65,
    5.18,
    5.4,
    1.74,
  );
  addSection(
    "Données flash",
    `Indice de qualité de la fiche\n${view.quality}\n\nNombre de clients et d'utilisateurs\n${view.clients}`,
    9.3,
    1.04,
    3.68,
    2.25,
    { background: colors.cyan, color: "FFFFFF" },
  );
  addSection(
    "Relation client",
    view.customerRelationship,
    9.3,
    3.46,
    3.68,
    1.55,
  );
  addSection("Coûts et revenus", view.costs, 9.3, 5.18, 3.68, 1.74);
  addFooter(slide);

  for (const [title, lines] of overflow) {
    const pageCount = Math.ceil(lines.length / 18);
    for (let offset = 0; offset < lines.length; offset += 18) {
      const detail = presentation.addSlide({ masterName: "PRODUCT_DETAIL" });
      const pageTitle =
        pageCount > 1 ? `${title} (${offset / 18 + 1}/${pageCount})` : title;
      detail.addText(pageTitle, {
        placeholder: "title",
        objectName: `Titre : ${title}`,
        lang: language,
        x: 0.5,
        y: 0.35,
        w: 12.3,
        h: 0.65,
        fontSize: 26,
        bold: true,
        color: colors.blue,
        margin: 0,
      });
      detail.addText(lines.slice(offset, offset + 18).join("\n"), {
        objectName: `Contenu complet : ${title}`,
        lang: language,
        x: 0.5,
        y: 1.3,
        w: 12.3,
        h: 5.6,
        fontSize: 18,
        color: colors.text,
        margin: 0,
        valign: "top",
        paraSpaceAfter: 0,
        lineSpacingMultiple: 1,
      });
      addFooter(detail);
    }
  }

  const output = await presentation.write({
    outputType: "nodebuffer",
    compression: true,
  });
  if (!Buffer.isBuffer(output)) {
    throw new Error(
      "La génération PowerPoint n'a pas produit de fichier binaire.",
    );
  }
  return output;
}
