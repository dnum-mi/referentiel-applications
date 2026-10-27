import * as ExcelJS from "exceljs";
import JSZip from "jszip";
import { convert } from "html-to-text";
import type { ApplicationStatus } from "@prisma/client";
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
  compliance: {
    id: "compliance-centre",
    eco_index_target_url: "https://service.example.test",
  },
  technologies: [
    {
      technology: "Serveur d’application",
      product: "Produit <historique>",
      version: "1.0",
      eolDate: new Date("2020-01-01T00:00:00.000Z"),
      eoasDate: new Date("2019-01-01T00:00:00.000Z"),
      latestVersion: "2.0",
      eolSource: "manual",
    },
  ],
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

  const construction: ApplicationStatus = {
    id: "status-construction",
    applicationId: application.id,
    status: "under_construction",
    statusDate: new Date("2026-10-15T08:00:00Z"),
    version: null,
  };
  const production: ApplicationStatus = {
    ...construction,
    id: "status-current-production",
    status: "in_production",
    statusDate: new Date("2026-10-15T11:00:00Z"),
  };

  it.each([
    [construction, production],
    [production, construction],
  ])(
    "identifie le statut courant malgré deux changements le même jour (%#)",
    async (first, second) => {
      const app = {
        ...application,
        currentStatusId: production.id,
        currentStatus: production,
        statuses: [first, second],
      };
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(
        (await useCase.executeWithApps([app])) as unknown as ExcelJS.Buffer,
      );
      const applications = workbook.getWorksheet("Applications");
      expect(applications.getCell("J1").text).toBe("ID Statut actuel");
      expect(applications.getCell("K1").text).toBe("Statut actuel");
      expect(applications.getCell("J2").text).toBe(production.id);
      // Même relation currentStatus et même libellé que la fiche ApplicationPage.
      expect(applications.getCell("K2").text).toBe("En production");
      const statuses = workbook.getWorksheet("Statuts");
      expect(statuses.getCell("E1").text).toBe("ID Statut");
      const matchingRows: ExcelJS.Row[] = [];
      statuses.eachRow((row, index) => {
        if (index === 1) return;
        expect(row.getCell(4).text).toBe("2026-10-15");
        if (row.getCell(5).text === applications.getCell("J2").text)
          matchingRows.push(row);
      });
      expect(matchingRows).toHaveLength(1);
      expect(matchingRows[0].getCell(3).text).toBe("En production");
      expect(statuses.getCell("E2").text).toBe(first.id);
      expect(statuses.getCell("E3").text).toBe(second.id);

      const html = (await useCase.executeHtmlWithApps([app])).toString("utf-8");
      const applicationsSection = html
        .split('id="section-1"')[1]
        .split("</section>")[0];
      expect(applicationsSection).toContain("Statut actuel");
      expect(applicationsSection).toContain("En production");
      expect(applicationsSection).not.toContain("En construction");
      const statusesSection = html
        .split('id="section-11"')[1]
        .split("</section>")[0];
      expect(statusesSection).toContain("ID Statut");
      expect(statusesSection).toContain(construction.id);
      expect(statusesSection).toContain(production.id);
    },
  );

  it.each([
    {
      currentStatus: construction,
      statuses: [construction],
      label: "En construction",
    },
    { currentStatus: null, statuses: [], label: "" },
    { currentStatus: null, statuses: [construction, production], label: "" },
  ])(
    "exporte le statut courant sans le déduire de l'historique (%#)",
    async ({ currentStatus, statuses, label }) => {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(
        (await useCase.executeWithApps([
          {
            ...application,
            currentStatus,
            currentStatusId: currentStatus?.id ?? null,
            statuses,
          },
        ])) as unknown as ExcelJS.Buffer,
      );
      const applications = workbook.getWorksheet("Applications");
      expect(applications.getCell("J2").text).toBe(currentStatus?.id ?? "");
      expect(applications.getCell("K2").text).toBe(label);
      expect(workbook.getWorksheet("Statuts").actualRowCount).toBe(
        statuses.length + 1,
      );
    },
  );

  it("conserve les onze feuilles, les technologies et le sens des relations dans les deux formats", async () => {
    const buffer = await useCase.executeWithApps([application]);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    expect(workbook.worksheets).toHaveLength(11);
    const compliances = workbook.getWorksheet("Conformités");
    let ecoIndexColumn = 0;
    compliances.getRow(1).eachCell((cell, columnNumber) => {
      if (cell.text === "EcoIndex URL cible") ecoIndexColumn = columnNumber;
    });
    expect(ecoIndexColumn).toBeGreaterThan(0);
    expect(compliances.getRow(2).getCell(ecoIndexColumn).text).toBe(
      "https://service.example.test",
    );
    const technologies = workbook.getWorksheet("Technologies");
    expect(technologies.getRow(2).values).toEqual(
      expect.arrayContaining([
        "application-centre",
        "Application centrale",
        "Serveur d’application",
        "Produit <historique>",
        "1.0",
        "2020-01-01",
        "2019-01-01",
        "2.0",
        "Saisie manuelle",
        "Fin de vie dépassée",
      ]),
    );
    const incoming = workbook.getWorksheet("Relations entrantes");
    const outgoing = workbook.getWorksheet("Relations sortantes");
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
      .split('id="section-10"')[1]
      .split("</section>")[0];
    expect(incomingSection).toContain("Source entrante");
    expect(incomingSection).not.toContain("Cible sortante");
    for (const sheet of workbook.worksheets) {
      expect(html).toContain(sheet.name);
      sheet.eachRow((row, index) => {
        if (index > 1)
          row.eachCell((cell) => {
            expect(convert(html, { wordwrap: false })).toContain(cell.text);
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
    expect(tables).toHaveLength(11);
    for (const path of tables) {
      const xml = await zip.file(path).async("string");
      expect(xml).toContain("<tableColumns");
      expect(xml).toContain("<autoFilter");
    }
    const core = await zip.file("docProps/core.xml").async("string");
    expect(core).toContain("<dc:title>Export des applications</dc:title>");
    expect(core).toContain("<dc:language>fr-FR</dc:language>");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    expect(workbook.getWorksheet("Applications").getCell("D2").hyperlink).toBe(
      application.logo,
    );
    const resources = workbook.getWorksheet("Ressources externes");
    expect(resources.getCell("C2").hyperlink).toBe("https://example.test/doc");
    expect(resources.getCell("C3").hyperlink).toBeUndefined();
    expect(resources.getCell("C3").value).toBe("javascript:alert(1)");
  });

  it("garde les feuilles et en-têtes d'un export vide", async () => {
    const buffer = await useCase.executeWithApps([]);
    const zip = await JSZip.loadAsync(buffer);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    expect(workbook.getWorksheet("Applications").getCell("K1").text).toBe(
      "Statut actuel",
    );
    expect(workbook.getWorksheet("Statuts").getCell("E1").text).toBe(
      "ID Statut",
    );
    expect(
      Object.keys(zip.files).filter((path) =>
        /^xl\/tables\/table\d+\.xml$/.test(path),
      ),
    ).toHaveLength(11);
    const html = (await useCase.executeHtmlWithApps([])).toString("utf-8");
    expect(html.match(/<section /g)).toHaveLength(11);
    expect(html.match(/Aucune ligne\./g)).toHaveLength(11);
    expect(html).toContain("Statut actuel");
    expect(html).toContain("ID Statut");
  });
});
