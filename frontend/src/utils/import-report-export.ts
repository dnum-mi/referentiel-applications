import type { ImportReportDto } from "@/client";

export interface ImportReportSection {
  id: "detail" | "summary" | "logs";
  title: string;
  headers: string[];
  rows: string[][];
}

/** Les deux documents contiennent les mêmes valeurs, sans modifier le rapport reçu. */
export function importReportSections(report: ImportReportDto): ImportReportSection[] {
  return [
    {
      id: "detail",
      title: "Détail par ligne",
      headers: ["Onglet", "Ligne", "Statut", "Identifiant", "Détail"],
      rows: report.entries.map((entry) => [entry.sheet, String(entry.row), entry.status, entry.identifier ?? "", entry.message ?? ""]),
    },
    {
      id: "summary",
      title: "Résumé de l’import",
      headers: ["Information", "Valeur"],
      rows: [
        ["Créés", String(report.summary.created)],
        ["Mis à jour", String(report.summary.updated)],
        ["Erreurs", String(report.summary.errors)],
        ...report.summary.processedSheets.map((sheet) => ["Onglet traité", sheet]),
        ...report.summary.ignoredSheets.map((sheet) => ["Onglet ignoré", sheet]),
      ],
    },
    {
      id: "logs",
      title: "Journal d’exécution",
      headers: ["N°", "Message"],
      rows: report.logs.map((message, index) => [String(index + 1), message]),
    },
  ];
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export function createImportReportCsv(report: ImportReportDto): string {
  const sections = importReportSections(report);
  const columns = Math.max(...sections.map((section) => section.headers.length));
  const row = (values: string[]) => Array.from({ length: columns }, (_, index) => csvCell(values[index] ?? "")).join(";");
  const content = sections
    .map((section, index) =>
      [...(index === 0 ? [] : [row([]), row([section.title])]), row(section.headers), ...section.rows.map(row)].join("\r\n"),
    )
    .join("\r\n");
  return `\uFEFF${content}`;
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function reportTable(caption: string, headers: string[], rows: string[][]) {
  const headings = headers.map((header) => `<th scope="col">${escapeHtml(header)}</th>`).join("");
  const body = rows
    .map((values) => {
      const cells = values
        .map((value, index) => (index === 0 ? `<th scope="row">${escapeHtml(value)}</th>` : `<td>${escapeHtml(value)}</td>`))
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");
  return `<table><caption>${escapeHtml(caption)}</caption><thead><tr>${headings}</tr></thead><tbody>${body}</tbody></table>`;
}

export function createImportReportHtml(report: ImportReportDto): string {
  const sections = importReportSections(report);
  const content = sections
    .map((section) => {
      const body =
        section.id === "detail"
          ? section.rows
              .map((values, index) =>
                reportTable(
                  `Détail par ligne — entrée ${index + 1}`,
                  ["Champ", "Valeur"],
                  section.headers.map((header, field) => [header, values[field]]),
                ),
              )
              .join("")
          : reportTable(section.title, section.headers, section.rows);
      return `<section id="${section.id}" aria-labelledby="${section.id}-title" tabindex="-1"><h2 id="${section.id}-title">${escapeHtml(section.title)}</h2>${section.rows.length ? body : "<p>Aucune ligne.</p>"}</section>`;
    })
    .join("\n");
  const links = sections.map((section) => `<li><a href="#${section.id}">${escapeHtml(section.title)}</a></li>`).join("");
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rapport d’import — Référentiel des applications</title>
<style>
* { box-sizing: border-box; } body { max-width: 60rem; margin: auto; padding: 1rem; font: 1rem/1.5 Arial, sans-serif; color: #161616; background: #fff; overflow-wrap: anywhere; }
h1, h2 { color: #000091; } a { color: #000091; text-decoration: underline; } a:focus-visible { outline: 3px solid #000091; outline-offset: 3px; }
table { width: 100%; table-layout: fixed; border-collapse: collapse; margin: 1rem 0 2rem; } caption { text-align: left; font-weight: bold; }
th, td { border: 1px solid #666; padding: .5rem; text-align: left; vertical-align: top; white-space: pre-wrap; } th { width: 35%; background: #f6f6f6; }
footer { margin-top: 2rem; border-top: 1px solid #666; }
</style></head><body><header><p>Référentiel des applications</p></header><main><h1>Rapport d’import</h1>
<nav aria-label="Sections du rapport"><ul>${links}</ul></nav>
${content}</main><footer><p>Ce rapport conserve les données et le journal de l’import.</p></footer></body></html>`;
}
