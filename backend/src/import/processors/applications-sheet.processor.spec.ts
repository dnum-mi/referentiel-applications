// Neutralise une dépendance circulaire préexistante du graphe d'import
// (base.service <-> metadatas.service) qui casse à l'évaluation sous ts-jest.
jest.mock("src/metadatas/metadatas.service", () => ({
  MetadatasService: class {},
}));

import * as ExcelJS from "exceljs";
import { PriorityRestartLabels } from "src/applications/constants/enum-label";
import type { ApplicationService } from "src/applications/application.service";
import { sheetLabels } from "src/applications/constants/application-export.sheet-labels";
import type { CheckPermissions } from "src/common/service/check-permissions.service";
import type { PrismaService } from "src/prisma/prisma.service";
import type { Requestor } from "src/user/entities/user.entity";
import { createEmptyReport } from "../dto/import-report.dto";
import { ApplicationsSheetProcessor } from "./applications-sheet.processor";
import { CompliancesSheetProcessor } from "./compliances-sheet.processor";
import type { CompliancesService } from "src/compliances/compliances.service";

const requestor = { id: "user-1" } as unknown as Requestor;

function buildSheet(
  headers: string[],
  rows: (string | number)[][],
): ExcelJS.Worksheet {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet(sheetLabels.Applications);
  sheet.addRow(headers);
  for (const r of rows) sheet.addRow(r);
  return sheet;
}

function setup() {
  const prisma = {
    application: {
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        where.id === "ghost" ? null : { id: where.id },
      ),
    },
  };
  const applicationService = {
    createApplication: jest.fn().mockResolvedValue({ id: "new-app" }),
    update: jest.fn().mockResolvedValue({ id: "app-1" }),
  };
  const checkPermissions = { can: jest.fn().mockResolvedValue(true) };
  const processor = new ApplicationsSheetProcessor(
    prisma as unknown as PrismaService,
    applicationService as unknown as ApplicationService,
    checkPermissions as unknown as CheckPermissions,
  );
  return { processor, prisma, applicationService, checkPermissions };
}

describe("ApplicationsSheetProcessor", () => {
  it("rapporte deux erreurs sans succès pour la reproduction #2943", async () => {
    const { processor, applicationService, prisma, checkPermissions } = setup();
    const compliancesService = {
      findByApplicationId: jest.fn().mockResolvedValue({ id: "c-1" }),
      createOrUpdateByApplicationId: jest.fn(),
    };
    const compliances = new CompliancesSheetProcessor(
      prisma as unknown as PrismaService,
      compliancesService as unknown as CompliancesService,
      checkPermissions as unknown as CheckPermissions,
    );
    const report = createEmptyReport();
    await processor.process(
      buildSheet(
        ["Identifiant", "Libellé", "Priorité de redémarrage"],
        [["app-1", "Application", "R9"]],
      ),
      requestor,
      report,
    );
    const sheet = new ExcelJS.Workbook().addWorksheet(sheetLabels.Compliances);
    sheet.addRow(["ID Application", "DSFR Implémenté"]);
    sheet.addRow(["app-1", "Nno"]);
    await compliances.process(sheet, requestor, report);
    expect(report.summary).toMatchObject({ errors: 2, updated: 0, created: 0 });
    expect(report.entries.map((entry) => entry.status)).toEqual([
      "error",
      "error",
    ]);
    expect(applicationService.update).not.toHaveBeenCalled();
    expect(
      compliancesService.createOrUpdateByApplicationId,
    ).not.toHaveBeenCalled();
  });

  it.each(["", "app-1"])(
    "refuse les priorités invalides avant écriture (id=%s)",
    async (id) => {
      const { processor, applicationService } = setup();
      const report = createEmptyReport();
      await processor.process(
        buildSheet(
          ["Identifiant", "Libellé", "Priorité de redémarrage"],
          ["R9", "toString", "constructor", "__proto__"].map((value) => [
            id,
            "Application",
            value,
          ]),
        ),
        requestor,
        report,
      );
      expect(report.summary).toMatchObject({
        errors: 4,
        created: 0,
        updated: 0,
      });
      report.entries.forEach((entry, index) => {
        expect(entry).toMatchObject({ status: "error", row: index + 2 });
        expect(entry.message).toContain("Priorité de redémarrage");
        expect(entry.message).toContain(
          ["R9", "toString", "constructor", "__proto__"][index],
        );
      });
      expect(applicationService.update).not.toHaveBeenCalled();
      expect(applicationService.createApplication).not.toHaveBeenCalled();
    },
  );

  it.each(
    Object.entries(PriorityRestartLabels).flatMap(([code, label]) => [
      [code, code],
      [label, code],
    ]),
  )("accepte la priorité %s", async (value, code) => {
    const { processor, applicationService } = setup();
    const report = createEmptyReport();
    await processor.process(
      buildSheet(
        ["Identifiant", "Libellé", "Priorité de redémarrage"],
        [["app-1", "Application", value]],
      ),
      requestor,
      report,
    );
    expect(report.summary).toMatchObject({ errors: 0, updated: 1 });
    expect(applicationService.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ priorityRestart: code }),
      }),
    );
  });

  it.each([null, "", "   "])(
    "omet une priorité absente ou vide (%s) et poursuit après une erreur",
    async (value) => {
      const { processor, applicationService } = setup();
      const report = createEmptyReport();
      const headers = ["Identifiant", "Libellé", "Priorité de redémarrage"];
      const sheet = buildSheet(headers, [
        ["app-1", "Application", "R9"],
        ["app-1", "Application", value ?? ""],
      ]);
      if (value === null) sheet.spliceColumns(3, 1);
      await processor.process(sheet, requestor, report);
      expect(report.summary).toMatchObject({
        errors: value === null ? 0 : 1,
        updated: value === null ? 2 : 1,
      });
      expect(
        applicationService.update.mock.calls.at(-1)[0].data,
      ).not.toHaveProperty("priorityRestart");
    },
  );

  it.each([
    {
      headers: ["Logo"],
      cells: ["https://example.test/new.png"],
      logo: "https://example.test/new.png",
    },
    { headers: ["Logo"], cells: [""], logo: undefined },
    { headers: [], cells: [], logo: undefined },
  ])(
    "importe le logo sans effacer les valeurs omises : %j",
    async ({ headers, cells, logo }) => {
      const { processor, applicationService } = setup();
      const report = createEmptyReport();

      await processor.process(
        buildSheet(
          ["Identifiant", "Libellé", ...headers],
          [["app-1", "App MAJ", ...cells]],
        ),
        requestor,
        report,
      );

      expect(report.summary.updated).toBe(1);
      expect(report.summary.errors).toBe(0);
      expect(applicationService.update).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: "app-1",
          data:
            logo === undefined
              ? expect.not.objectContaining({ logo: expect.anything() })
              : expect.objectContaining({ logo }),
        }),
      );
    },
  );

  it("crée une application sans identifiant", async () => {
    const { processor, applicationService } = setup();
    const report = createEmptyReport();
    await processor.process(
      buildSheet(
        ["Identifiant", "Libellé", "Description"],
        [["", "Nouvelle App", "Une description"]],
      ),
      requestor,
      report,
    );

    expect(report.summary.created).toBe(1);
    expect(report.summary.errors).toBe(0);
    expect(applicationService.createApplication).toHaveBeenCalledWith(
      "user-1",
      // `tags` doit être un tableau (défaut []) : `createApplication` le passe à `findByNames`.
      expect.objectContaining({ label: "Nouvelle App", tags: [] }),
    );
  });

  it("met à jour une application avec identifiant", async () => {
    const { processor, applicationService } = setup();
    const report = createEmptyReport();
    await processor.process(
      buildSheet(
        ["Identifiant", "Libellé", "Description"],
        [["app-1", "App MAJ", "Desc"]],
      ),
      requestor,
      report,
    );

    expect(report.summary.updated).toBe(1);
    expect(applicationService.update).toHaveBeenCalledWith(
      expect.objectContaining({ applicationId: "app-1" }),
    );
  });

  it("résout les listes (séparées par des virgules) et la priorité par libellé", async () => {
    const { processor, applicationService } = setup();
    const report = createEmptyReport();
    await processor.process(
      buildSheet(
        [
          "Identifiant",
          "Libellé",
          "Description",
          "Tags",
          "Priorité de redémarrage",
        ],
        [["", "App listes", "Desc", "a, b, c", "R0 - Immédiat (H24)"]],
      ),
      requestor,
      report,
    );

    expect(report.summary.created).toBe(1);
    expect(applicationService.createApplication).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        tags: ["a", "b", "c"],
        priorityRestart: "R0",
      }),
    );
  });

  it("consigne une erreur quand l'application à mettre à jour est introuvable", async () => {
    const { processor } = setup();
    const report = createEmptyReport();
    await processor.process(
      buildSheet(
        ["Identifiant", "Libellé", "Description"],
        [["ghost", "Fantôme", "Desc"]],
      ),
      requestor,
      report,
    );

    expect(report.summary.errors).toBe(1);
    expect(report.entries[0].message).toMatch(/Application introuvable/i);
  });

  it("erreur de validation si le libellé est trop court (création)", async () => {
    const { processor, applicationService } = setup();
    const report = createEmptyReport();
    await processor.process(
      buildSheet(
        ["Identifiant", "Libellé", "Description"],
        [["", "X", "Desc"]],
      ),
      requestor,
      report,
    );

    expect(report.summary.errors).toBe(1);
    expect(report.entries[0].message).toMatch(/Validation/i);
    expect(applicationService.createApplication).not.toHaveBeenCalled();
  });

  it("ne traite pas l'onglet sans la colonne Identifiant", async () => {
    const { processor } = setup();
    const report = createEmptyReport();
    await processor.process(
      buildSheet(["Libellé", "Description"], [["App", "Desc"]]),
      requestor,
      report,
    );

    expect(report.summary.processedSheets).not.toContain(
      sheetLabels.Applications,
    );
    expect(report.logs.join(" ")).toMatch(/colonnes manquantes/i);
  });

  it("refuse la création sans la permission globale CreateApplication", async () => {
    const { processor, checkPermissions, applicationService } = setup();
    checkPermissions.can.mockResolvedValue(false);
    const report = createEmptyReport();
    await processor.process(
      buildSheet(
        ["Identifiant", "Libellé", "Description"],
        [["", "Nouvelle App", "Desc"]],
      ),
      requestor,
      report,
    );

    expect(report.summary.errors).toBe(1);
    expect(report.entries[0].message).toMatch(
      /Droits insuffisants.*CreateApplication/i,
    );
    expect(applicationService.createApplication).not.toHaveBeenCalled();
  });

  it("refuse la mise à jour sans droits AppWrite sur l'application", async () => {
    const { processor, checkPermissions, applicationService } = setup();
    checkPermissions.can.mockResolvedValue(false);
    const report = createEmptyReport();
    await processor.process(
      buildSheet(
        ["Identifiant", "Libellé", "Description"],
        [["app-1", "App MAJ", "Desc"]],
      ),
      requestor,
      report,
    );

    expect(report.summary.errors).toBe(1);
    expect(report.entries[0].message).toMatch(/Droits insuffisants.*AppWrite/i);
    expect(applicationService.update).not.toHaveBeenCalled();
  });
});
