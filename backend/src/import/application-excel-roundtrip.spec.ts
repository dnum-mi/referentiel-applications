// Le graphe BaseService / MetadatasService est circulaire ; le test conserve
// l'export XLSX, sa lecture et le vrai processeur, sans appeler la base métier.
jest.mock("src/metadatas/metadatas.service", () => ({
  MetadatasService: class {},
}));

import * as ExcelJS from "exceljs";
import type { ApplicationService } from "src/applications/application.service";
import { columnLabels } from "src/applications/columnLabels/application-export.columnLabels";
import { sheetLabels } from "src/applications/constants/application-export.sheet-labels";
import type { ApplicationWithAllRelations } from "src/applications/types/application.type";
import { ExportApplicationsUseCase } from "src/applications/usecases/application-export.usecase";
import type { CheckPermissions } from "src/common/service/check-permissions.service";
import { ExcelBuilderService } from "src/common/service/excel-builder.service";
import { jsonListHeader } from "src/common/utils/excel-list.util";
import type { PrismaService } from "src/prisma/prisma.service";
import type { Requestor } from "src/user/entities/user.entity";
import { ExcelImportService } from "./excel-import.service";
import type { ActorsSheetProcessor } from "./processors/actors-sheet.processor";
import { ApplicationsSheetProcessor } from "./processors/applications-sheet.processor";
import type { CompliancesSheetProcessor } from "./processors/compliances-sheet.processor";
import type { HostingsSheetProcessor } from "./processors/hostings-sheet.processor";

const requestor = { id: "user-1" } as Requestor;
const exporter = new ExportApplicationsUseCase(new ExcelBuilderService());

function setup() {
  const applicationService = {
    update: jest.fn().mockResolvedValue({ id: "app-1" }),
    createApplication: jest.fn().mockResolvedValue({ id: "new-app" }),
  };
  const applications = new ApplicationsSheetProcessor(
    {
      application: { findUnique: jest.fn().mockResolvedValue({ id: "app-1" }) },
    } as unknown as PrismaService,
    applicationService as unknown as ApplicationService,
    { can: jest.fn().mockResolvedValue(true) } as unknown as CheckPermissions,
  );
  // Ces onglets ne concernent pas les listes de la fiche application.
  const processor = (sheetName: string) => ({
    sheetName,
    process: jest.fn().mockResolvedValue(undefined),
  });
  const importer = new ExcelImportService(
    applications,
    processor(sheetLabels.Hostings) as unknown as HostingsSheetProcessor,
    processor(sheetLabels.Actors) as unknown as ActorsSheetProcessor,
    processor(sheetLabels.Compliances) as unknown as CompliancesSheetProcessor,
  );
  return { importer, applicationService };
}

function application(values: string[]): ApplicationWithAllRelations {
  return {
    id: "app-1",
    label: "Application listes",
    description: "Une description",
    purposes: values,
    targetPopulations: values,
    tags: values.map((name, index) => ({
      id: `tag-${index}`,
      name,
      createdAt: new Date("2026-01-01"),
    })),
  } as unknown as ApplicationWithAllRelations;
}

async function legacyOrEditedWorkbook(
  values: string[][],
  jsonEncoded: boolean,
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetLabels.Applications);
  const listHeader = (name: string) =>
    jsonEncoded ? jsonListHeader(name) : name;
  worksheet.addRow([
    columnLabels.id,
    columnLabels.label,
    listHeader(columnLabels.tags),
    listHeader(columnLabels.purposes),
    listHeader(columnLabels.targetPopulations),
  ]);
  for (const row of values) worksheet.addRow(row);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe("Excel applications — listes réversibles (#2940)", () => {
  it.each([
    { values: ["Piloter, contrôler", "Agents, prestataires", "Autre valeur"] },
    { values: ['Avec "guillemets"', "Ligne 1\nLigne 2", "a;b", "[valeur]"] },
    {
      values: [
        "  Espaces conservés  ",
        "",
        "日本語, français",
        "doublon",
        "doublon",
      ],
    },
    { values: [] },
  ])(
    "conserve exactement les trois listes après export puis réimport : $values",
    async ({ values }) => {
      const { importer, applicationService } = setup();
      const app = application(values);
      const buffer = await exporter.executeWithApps([app]);

      const report = await importer.importFromExcel(buffer, requestor);

      expect(report.summary.updated).toBe(1);
      expect(report.summary.errors).toBe(0);
      expect(applicationService.update).toHaveBeenCalledTimes(1);
      expect(applicationService.update).toHaveBeenCalledWith({
        applicationId: app.id,
        data: expect.objectContaining({
          purposes: values,
          targetPopulations: values,
          tags: values,
        }),
        requestor,
      });
    },
  );

  it.each([
    columnLabels.tags,
    columnLabels.purposes,
    columnLabels.targetPopulations,
  ])(
    "refuse la feuille contenant les deux formats de la colonne %s",
    async (header) => {
      const { importer, applicationService } = setup();
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(sheetLabels.Applications);
      sheet.addRow([
        columnLabels.id,
        columnLabels.label,
        header,
        jsonListHeader(header),
      ]);
      sheet.addRow(["app-1", "Application ambiguë", "a, b", '["autre"]']);

      const report = await importer.importFromExcel(
        Buffer.from(await workbook.xlsx.writeBuffer()),
        requestor,
      );

      expect(report.logs.join(" ")).toMatch(/colonnes de liste ambiguës/);
      expect(report.summary.processedSheets).not.toContain(
        sheetLabels.Applications,
      );
      expect(applicationService.update).not.toHaveBeenCalled();
      expect(applicationService.createApplication).not.toHaveBeenCalled();
    },
  );

  it("lit les anciens en-têtes sans interpréter un libellé ressemblant à JSON", async () => {
    const { importer, applicationService } = setup();
    const buffer = await legacyOrEditedWorkbook(
      [
        [
          "app-1",
          "Application listes",
          "a, b, c",
          '["Libellé"]',
          "Agents, Visiteurs",
        ],
      ],
      false,
    );

    const report = await importer.importFromExcel(buffer, requestor);

    expect(report.summary.errors).toBe(0);
    expect(applicationService.update).toHaveBeenCalledWith({
      applicationId: "app-1",
      requestor,
      data: expect.objectContaining({
        tags: ["a", "b", "c"],
        purposes: ['["Libellé"]'],
        targetPopulations: ["Agents", "Visiteurs"],
      }),
    });
  });

  it("distingue une cellule vide laissée intacte d'une liste [] à vider", async () => {
    const { importer, applicationService } = setup();
    const buffer = await legacyOrEditedWorkbook(
      [["app-1", "Application listes", "[]", "", '["Population"]']],
      true,
    );

    const report = await importer.importFromExcel(buffer, requestor);

    expect(report.summary.errors).toBe(0);
    const data = applicationService.update.mock.calls[0][0].data;
    expect(data).toMatchObject({ tags: [], targetPopulations: ["Population"] });
    expect(data).not.toHaveProperty("purposes");
  });

  it.each(['["incomplet"', "a, b", "{}", '["valide", 1]', "null"])(
    "refuse toute la ligne JSON invalide (%s) et poursuit l'import",
    async (invalid) => {
      const { importer, applicationService } = setup();
      const buffer = await legacyOrEditedWorkbook(
        [
          ["app-1", "Ligne refusée", '["Tag"]', invalid, '["Population"]'],
          [
            "app-2",
            "Ligne valide",
            '["Tag"]',
            '["Finalité"]',
            '["Population"]',
          ],
        ],
        true,
      );

      const report = await importer.importFromExcel(buffer, requestor);

      expect(report.summary).toMatchObject({ errors: 1, updated: 1 });
      expect(report.entries[0]).toMatchObject({
        row: 2,
        status: "error",
        message: expect.stringContaining("liste JSON de chaînes valide"),
      });
      expect(applicationService.update).toHaveBeenCalledTimes(1);
      expect(applicationService.update).toHaveBeenCalledWith(
        expect.objectContaining({ applicationId: "app-2" }),
      );
    },
  );
});
