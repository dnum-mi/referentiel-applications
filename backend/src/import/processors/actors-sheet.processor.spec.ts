// Neutralise une dépendance circulaire préexistante du graphe d'import
// (base.service <-> metadatas.service) qui casse à l'évaluation sous ts-jest.
jest.mock("src/metadatas/metadatas.service", () => ({
  MetadatasService: class {},
}));

import * as ExcelJS from "exceljs";
import { columnLabels } from "src/applications/columnLabels/application-export.columnLabels";
import { sheetLabels } from "src/applications/constants/application-export.sheet-labels";
import type { ActorService } from "src/actor/actor.service";
import type { CheckPermissions } from "src/common/service/check-permissions.service";
import type { PrismaService } from "src/prisma/prisma.service";
import type { Requestor } from "src/user/entities/user.entity";
import { createEmptyReport } from "../dto/import-report.dto";
import { ActorsSheetProcessor } from "./actors-sheet.processor";

const requestor = { id: "user-1" } as unknown as Requestor;

interface Row {
  id?: string;
  applicationId?: string;
  firstname?: string;
  lastname?: string;
  role?: string;
  type?: string;
  email?: string;
}

const DEFAULT_HEADERS = [
  columnLabels.applicationId,
  columnLabels.applicationLabel,
  columnLabels["actors.id"],
  columnLabels["actors.firstname"],
  columnLabels["actors.lastname"],
  columnLabels["actors.role"],
  columnLabels["actors.type"],
  columnLabels["actors.email"],
];

function buildSheet(
  rows: Row[],
  headers: string[] = DEFAULT_HEADERS,
): ExcelJS.Worksheet {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet(sheetLabels.Actors);
  sheet.addRow(headers);
  for (const r of rows) {
    sheet.addRow([
      r.applicationId ?? "",
      "",
      r.id ?? "",
      r.firstname ?? "",
      r.lastname ?? "",
      r.role ?? "",
      r.type ?? "",
      r.email ?? "",
    ]);
  }
  return sheet;
}

function setup() {
  const prisma = {
    application: { findUnique: jest.fn().mockResolvedValue({ id: "app-1" }) },
    actor: { findUnique: jest.fn().mockResolvedValue({ id: "actor-1" }) },
    actorType: { findFirst: jest.fn().mockResolvedValue({ id: "type-1" }) },
  };
  const actorService = {
    create: jest.fn().mockResolvedValue({ id: "new-actor" }),
    update: jest.fn().mockResolvedValue({ id: "actor-1" }),
  };
  const checkPermissions = { can: jest.fn().mockResolvedValue(true) };
  const processor = new ActorsSheetProcessor(
    prisma as unknown as PrismaService,
    actorService as unknown as ActorService,
    checkPermissions as unknown as CheckPermissions,
  );
  return { processor, prisma, actorService, checkPermissions };
}

describe("ActorsSheetProcessor", () => {
  it("crée un acteur sans ID Acteur", async () => {
    const { processor, actorService } = setup();
    const report = createEmptyReport();
    await processor.process(
      buildSheet([
        {
          applicationId: "app-1",
          lastname: "Dupont",
          role: "MOA",
          email: "a@b.com",
        },
      ]),
      requestor,
      report,
    );
    expect(report.summary.created).toBe(1);
    expect(report.summary.errors).toBe(0);
    expect(report.summary.processedSheets).toContain(sheetLabels.Actors);
    expect(actorService.create).toHaveBeenCalled();
  });

  it("met à jour un acteur avec ID Acteur", async () => {
    const { processor, actorService } = setup();
    const report = createEmptyReport();
    await processor.process(
      buildSheet([{ id: "actor-1", applicationId: "app-1", role: "MOA" }]),
      requestor,
      report,
    );
    expect(report.summary.updated).toBe(1);
    expect(actorService.update).toHaveBeenCalled();
  });

  it("erreur si l'acteur à mettre à jour est introuvable", async () => {
    const { processor, prisma } = setup();
    prisma.actor.findUnique.mockResolvedValue(null);
    const report = createEmptyReport();
    await processor.process(
      buildSheet([{ id: "missing", applicationId: "app-1", role: "MOA" }]),
      requestor,
      report,
    );
    expect(report.summary.errors).toBe(1);
    expect(report.entries[0].message).toMatch(/introuvable/i);
  });

  it("erreur si l'application est introuvable", async () => {
    const { processor, prisma } = setup();
    prisma.application.findUnique.mockResolvedValue(null);
    const report = createEmptyReport();
    await processor.process(
      buildSheet([{ applicationId: "ghost", role: "MOA", email: "a@b.com" }]),
      requestor,
      report,
    );
    expect(report.summary.errors).toBe(1);
    expect(report.entries[0].message).toMatch(/Application introuvable/i);
  });

  it("erreur si le rôle est introuvable", async () => {
    const { processor, prisma } = setup();
    prisma.actorType.findFirst.mockResolvedValue(null);
    const report = createEmptyReport();
    await processor.process(
      buildSheet([{ applicationId: "app-1", role: "X", email: "a@b.com" }]),
      requestor,
      report,
    );
    expect(report.summary.errors).toBe(1);
    expect(report.entries[0].message).toMatch(/Type d'acteur introuvable/i);
  });

  it("résout le type par libellé si le rôle est vide", async () => {
    const { processor, prisma, actorService } = setup();
    prisma.actorType.findFirst.mockResolvedValue({ id: "type-label" });
    const report = createEmptyReport();
    await processor.process(
      buildSheet([
        { applicationId: "app-1", type: "Libellé", email: "a@b.com" },
      ]),
      requestor,
      report,
    );
    expect(report.summary.created).toBe(1);
    expect(actorService.create).toHaveBeenCalledWith(
      expect.objectContaining({ actorTypeId: "type-label" }),
      "app-1",
      "user-1",
    );
  });

  it("erreur de validation pour un email invalide", async () => {
    const { processor } = setup();
    const report = createEmptyReport();
    await processor.process(
      buildSheet([{ applicationId: "app-1", role: "MOA", email: "bad" }]),
      requestor,
      report,
    );
    expect(report.summary.errors).toBe(1);
    expect(report.entries[0].message).toMatch(/Validation/i);
  });

  it("poursuit après une ligne fautive et ignore les lignes vides", async () => {
    const { processor, prisma } = setup();
    prisma.actorType.findFirst
      .mockResolvedValueOnce({ id: "type-1" })
      .mockResolvedValue(null);
    const report = createEmptyReport();
    await processor.process(
      buildSheet([
        { applicationId: "app-1", role: "MOA", email: "ok@b.com" },
        {},
        { applicationId: "app-1", role: "X", email: "ko@b.com" },
      ]),
      requestor,
      report,
    );
    expect(report.summary.created).toBe(1);
    expect(report.summary.errors).toBe(1);
    expect(report.entries).toHaveLength(2);
  });

  it("ne traite pas l'onglet si une colonne requise manque", async () => {
    const { processor } = setup();
    const report = createEmptyReport();
    await processor.process(
      buildSheet(
        [{ applicationId: "app-1", role: "MOA" }],
        [columnLabels.applicationId, columnLabels["actors.role"]],
      ),
      requestor,
      report,
    );
    expect(report.summary.processedSheets).not.toContain(sheetLabels.Actors);
    expect(report.logs.join(" ")).toMatch(/colonnes manquantes/i);
  });

  it("coerce les cellules non textuelles (richText, date, hyperlien)", async () => {
    const { processor, actorService } = setup();
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet(sheetLabels.Actors);
    sheet.addRow(DEFAULT_HEADERS);
    const row = sheet.addRow([]);
    row.getCell(1).value = "app-1";
    row.getCell(4).value = { richText: [{ text: "Jean" }, { text: "-Luc" }] };
    row.getCell(5).value = new Date("2020-01-02T00:00:00.000Z");
    row.getCell(6).value = "MOA";
    row.getCell(8).value = {
      text: "rich@example.com",
      hyperlink: "mailto:rich@example.com",
    };
    const report = createEmptyReport();

    await processor.process(sheet, requestor, report);

    expect(report.summary.created).toBe(1);
    expect(actorService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        firstname: "Jean-Luc",
        email: "rich@example.com",
      }),
      "app-1",
      "user-1",
    );
  });

  it("refuse la ligne et consigne le motif sans droits ActorWrite sur l'application", async () => {
    const { processor, checkPermissions, actorService } = setup();
    checkPermissions.can.mockResolvedValue(false);
    const report = createEmptyReport();
    await processor.process(
      buildSheet([{ applicationId: "app-1", role: "MOA", email: "a@b.com" }]),
      requestor,
      report,
    );
    expect(report.summary.errors).toBe(1);
    expect(report.entries[0].message).toMatch(
      /Droits insuffisants.*ActorWrite/i,
    );
    expect(actorService.create).not.toHaveBeenCalled();
  });
});
