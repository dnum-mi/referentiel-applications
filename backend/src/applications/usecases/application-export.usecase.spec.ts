import * as ExcelJS from "exceljs";
import JSZip from "jszip";
import { convert } from "html-to-text";
import { ExcelBuilderService } from "src/common/service/excel-builder.service";
import type { ApplicationWithAllRelations } from "../types/application.type";
import { ExportApplicationsUseCase } from "./application-export.usecase";

const application = {
  id: "application-centre",
  label: "Application centrale",
  shortName: "Centre",
  description: "Description intégrale",
  purposes: ["Finalité"],
  targetPopulations: ["Population"],
  logo: "https://example.test/logo?a=1&b=2",
  tags: [],
  relationsAsSource: [
    {
      type: "is_part_of",
      targetApplication: { id: "application-cible", label: "Cible sortante" },
    },
  ],
  relationsAsTarget: [
    {
      type: "is_part_of",
      sourceApplication: { id: "application-source", label: "Source entrante" },
    },
  ],
  externalRessource: [
    {
      link: "https://example.test/doc",
      description: "Document",
      type: "documentation",
    },
    {
      link: "javascript:alert(1)",
      description: "Texte sans lien actif",
      type: "documentation",
    },
  ],
} as unknown as ApplicationWithAllRelations;

describe("Export des applications en XLSX et HTML", () => {
  const useCase = new ExportApplicationsUseCase(new ExcelBuilderService());

  it("conserve les dix feuilles et associe correctement les relations entrantes et sortantes", async () => {
    const buffer = await useCase.executeWithApps([application]);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    expect(workbook.worksheets).toHaveLength(10);
    const incoming = workbook.getWorksheet("Relations entrantes")!;
    const outgoing = workbook.getWorksheet("Relations sortantes")!;
    expect(incoming.getRow(2).values).toEqual(
      expect.arrayContaining([
        "application-centre",
        "application-source",
        "Source entrante",
      ]),
    );
    expect(incoming.getRow(2).values).not.toContain("Cible sortante");
    expect(outgoing.getRow(2).values).toEqual(
      expect.arrayContaining([
        "application-centre",
        "application-cible",
        "Cible sortante",
      ]),
    );
    expect(outgoing.getRow(2).values).not.toContain("Source entrante");
    const html = (await useCase.executeHtmlWithApps([application])).toString(
      "utf-8",
    );
    const incomingSection = html
      .split('id="section-9"')[1]
      .split("</section>")[0];
    expect(incomingSection).toContain("Source entrante");
    expect(incomingSection).not.toContain("Cible sortante");
    for (const sheet of workbook.worksheets) {
      expect(html).toContain(sheet.name);
      sheet.eachRow((row, index) => {
        if (index > 1)
          row.eachCell((cell) => {
            const value =
              typeof cell.value === "object" &&
              cell.value &&
              "text" in cell.value
                ? cell.value.text
                : cell.value;
            expect(convert(html, { wordwrap: false })).toContain(String(value));
          });
      });
    }
  });

  it("écrit des en-têtes structurés, des métadonnées françaises et uniquement des liens sûrs", async () => {
    const buffer = await useCase.executeWithApps([application]);
    const zip = await JSZip.loadAsync(buffer);
    const tables = Object.keys(zip.files).filter((path) =>
      /^xl\/tables\/table\d+\.xml$/.test(path),
    );
    expect(tables).toHaveLength(10);
    for (const path of tables) {
      const xml = await zip.file(path)!.async("string");
      expect(xml).toContain("<tableColumns");
      expect(xml).toContain("<autoFilter");
    }
    const core = await zip.file("docProps/core.xml")!.async("string");
    expect(core).toContain("<dc:title>Export des applications</dc:title>");
    expect(core).toContain("<dc:language>fr-FR</dc:language>");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    expect(workbook.getWorksheet("Applications")!.getCell("D2").hyperlink).toBe(
      application.logo,
    );
    const resources = workbook.getWorksheet("Ressources externes")!;
    expect(resources.getCell("C2").hyperlink).toBe("https://example.test/doc");
    expect(resources.getCell("C3").hyperlink).toBeUndefined();
    expect(resources.getCell("C3").value).toBe("javascript:alert(1)");
  });

  it("garde les feuilles et en-têtes d'un export vide", async () => {
    const zip = await JSZip.loadAsync(await useCase.executeWithApps([]));
    expect(
      Object.keys(zip.files).filter((path) =>
        /^xl\/tables\/table\d+\.xml$/.test(path),
      ),
    ).toHaveLength(10);
    const html = (await useCase.executeHtmlWithApps([])).toString("utf-8");
    expect(html.match(/<section /g)).toHaveLength(10);
    expect(html.match(/Aucune ligne\./g)).toHaveLength(10);
  });
});
