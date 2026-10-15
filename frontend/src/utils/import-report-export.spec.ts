import type { ImportReportDto } from "@/client";
import { createImportReportCsv, createImportReportHtml, importReportSections } from "./import-report-export";

export const reportFixture: ImportReportDto = {
  summary: { created: 1, updated: 1, errors: 1, processedSheets: ["Acteurs", "Applications; test"], ignoredSheets: ['Onglet "ignoré"'] },
  entries: [
    { sheet: "Acteurs; test", row: 2, status: "created", identifier: 'Acteur "A"; MI', message: 'Détail; "exact"\r\nDeuxième ligne 😀' },
    { sheet: "Applications", row: 3, status: "updated" },
    { sheet: "Conformités", row: 4, status: "error", identifier: "app-1", message: "<script>alert(1)</script> & texte" },
  ],
  logs: ['Journal; "avec guillemets"\nSuite', "Onglet ignoré <img src=x onerror=alert(1)>"],
};

/** Lecteur indépendant : accepte les séparateurs et retours dans une cellule citée. */
function parseCsv(csv: string) {
  const source = csv.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (char === '"') {
      if (quoted && source[index + 1] === '"') {
        value += '"';
        index++;
      } else quoted = !quoted;
    } else if (char === ";" && !quoted) {
      values.push(value);
      value = "";
    } else if ((char === "\r" || char === "\n") && !quoted) {
      if (char === "\r" && source[index + 1] === "\n") index++;
      rows.push([...values, value]);
      values = [];
      value = "";
    } else value += char;
  }
  rows.push([...values, value]);
  return rows;
}

const normalize = (rows: string[][]) => rows.map((row) => row.map((value) => value.replace(/\r\n?/g, "\n")));

describe("rapport d’import CSV et alternative HTML", () => {
  it.each([
    reportFixture,
    {
      summary: { created: 0, updated: 0, errors: 0, processedSheets: [], ignoredSheets: [] },
      entries: [],
      logs: [],
    } satisfies ImportReportDto,
  ])("conserve toutes les cellules, le résumé, les listes d’onglets et le journal dans les deux documents", (report) => {
    const original = JSON.stringify(report);
    const sections = importReportSections(report);
    expect(sections[0].rows).toEqual(
      report.entries.map((entry) => [entry.sheet, String(entry.row), entry.status, entry.identifier ?? "", entry.message ?? ""]),
    );
    expect(sections[1].rows).toEqual([
      ["Créés", String(report.summary.created)],
      ["Mis à jour", String(report.summary.updated)],
      ["Erreurs", String(report.summary.errors)],
      ...report.summary.processedSheets.map((sheet) => ["Onglet traité", sheet]),
      ...report.summary.ignoredSheets.map((sheet) => ["Onglet ignoré", sheet]),
    ]);
    expect(sections[2].rows).toEqual(report.logs.map((message, index) => [String(index + 1), message]));
    const csv = parseCsv(createImportReportCsv(report));
    const html = new DOMParser().parseFromString(createImportReportHtml(report), "text/html");
    let cursor = 0;
    for (const [index, section] of sections.entries()) {
      if (index) {
        expect(csv[cursor++]).toEqual(["", "", "", "", ""]);
        expect(csv[cursor++]).toEqual([section.title, "", "", "", ""]);
      }
      expect(csv[cursor++].slice(0, section.headers.length)).toEqual(section.headers);
      const csvRows = section.rows.map(() => csv[cursor++].slice(0, section.headers.length));
      expect(csvRows).toEqual(section.rows);
      const element = html.querySelector(`#${section.id}`)!;
      const htmlRows =
        section.id === "detail"
          ? Array.from(element.querySelectorAll("table"), (table) =>
              Array.from(table.querySelectorAll("tbody td"), (cell) => cell.textContent ?? ""),
            )
          : Array.from(element.querySelectorAll("tbody tr"), (row) => Array.from(row.children, (cell) => cell.textContent ?? ""));
      expect(normalize(htmlRows)).toEqual(normalize(csvRows));
    }
    expect(cursor).toBe(csv.length);
    expect(JSON.stringify(report)).toBe(original);
    expect(html.querySelector("script,img,iframe")).toBeNull();
    expect(html.documentElement.lang).toBe("fr");
    expect(html.title).toBe("Rapport d’import — Référentiel des applications");
    expect(html.querySelectorAll("header,main,footer")).toHaveLength(3);
    expect(Array.from(html.querySelectorAll("th")).every((cell) => ["row", "col"].includes(cell.scope))).toBe(true);
    expect(Array.from(html.querySelectorAll("table")).every((table) => Boolean(table.caption?.textContent))).toBe(true);
  });

  it("préserve les logs lorsqu’aucune ligne n’a été traitée", () => {
    const report: ImportReportDto = {
      summary: { created: 0, updated: 0, errors: 0, processedSheets: [], ignoredSheets: ["Acteurs"] },
      entries: [],
      logs: ["En-tête invalide; import non effectué"],
    };
    const csv = parseCsv(createImportReportCsv(report));
    expect(csv).toContainEqual(["1", report.logs[0], "", "", ""]);
    const html = new DOMParser().parseFromString(createImportReportHtml(report), "text/html");
    expect(html.querySelector("#logs td")?.textContent).toBe(report.logs[0]);
    expect(html.querySelector("#summary")?.textContent).toContain("Acteurs");
  });
});
