import { escapeHtml } from "src/utils/escape-html.util";
import type { ExcelSheetConfig } from "src/common/service/excel-builder.service";
import { exportCellText, safeExportLink } from "src/utils/export.util";

export const HTML_EXPORT_CONTENT_TYPE = "text/html;charset=utf-8";

export function createExportHtmlDocument(
  title: string,
  content: string,
  exportedAt = new Date(),
): Buffer {
  const date = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(exportedAt);
  return Buffer.from(
    `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} — RefApp</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0 auto; padding: 1rem; max-width: 72rem; font: 1rem/1.6 Arial, sans-serif; color: #161616; background: #fff; overflow-wrap: anywhere; }
  h1, h2, h3 { line-height: 1.3; color: #000091; }
  h1 { font-size: 1.75rem; } h2 { font-size: 1.4rem; }
  a { color: #000091; text-decoration: underline; }
  a:focus-visible { outline: 3px solid #000091; outline-offset: 3px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 1rem 0 2rem; }
  caption { text-align: left; font-weight: bold; padding: .5rem 0; }
  th, td { border: 1px solid #666; padding: .5rem; text-align: left; vertical-align: top; white-space: pre-wrap; }
  th { width: 38%; background: #f6f6f6; }
  dt { font-weight: bold; } dd { margin: 0 0 1rem; white-space: pre-wrap; }
  .text { white-space: pre-wrap; }
  footer { border-top: 1px solid #666; margin-top: 2rem; padding-top: 1rem; }
  @media print { body { max-width: none; } a { color: inherit; } }
</style></head><body>
<header><p>Référentiel des applications</p></header>
<main id="contenu"><h1>${escapeHtml(title)}</h1>
<p>Export du <time datetime="${exportedAt.toISOString()}">${escapeHtml(date)}</time>.</p>
${content}</main>
<footer><p>Export RefApp. Les informations reproduisent le périmètre du format correspondant.</p></footer>
</body></html>`,
    "utf-8",
  );
}

export function createApplicationsHtml(sheets: ExcelSheetConfig[]): Buffer {
  const navigation = `<nav aria-label="Sections de l’export"><h2>Sommaire</h2><ul>${sheets.map((sheet, index) => `<li><a href="#section-${index + 1}">${escapeHtml(sheet.name)}</a></li>`).join("")}</ul></nav>`;
  const sections = sheets
    .map((sheet, index) => {
      // Une table verticale par ligne conserve toutes les colonnes, même sur un
      // écran étroit et sans CSS, sans imposer une grille de 25 colonnes.
      const records = sheet.rows
        .map((row, rowIndex) => {
          const fields = sheet.columns
            .map(({ header, key }) => {
              const text = exportCellText(row[key]);
              const href =
                key === "logo" || key === "externalRessource.link"
                  ? safeExportLink(text)
                  : undefined;
              const value = href
                ? `<a href="${escapeHtml(href)}">${escapeHtml(text)}</a>`
                : escapeHtml(text);
              return `<tr><th scope="row">${escapeHtml(header)}</th><td>${value}</td></tr>`;
            })
            .join("");
          return `<table><caption>${escapeHtml(sheet.name)} — ligne ${rowIndex + 1}</caption><thead><tr><th scope="col">Champ</th><th scope="col">Valeur</th></tr></thead><tbody>${fields}</tbody></table>`;
        })
        .join("");
      const empty = `<p>Aucune ligne.</p><p>Champs exportés : ${sheet.columns.map(({ header }) => escapeHtml(header)).join(" ; ")}.</p>`;
      return `<section aria-labelledby="titre-${index + 1}" id="section-${index + 1}"><h2 id="titre-${index + 1}">${escapeHtml(sheet.name)} (${sheet.rows.length} lignes)</h2>${records || empty}</section>`;
    })
    .join("\n");
  return createExportHtmlDocument(
    "Export des applications",
    navigation + sections,
  );
}
