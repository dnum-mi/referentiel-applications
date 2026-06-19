// Neutralise une dépendance circulaire préexistante du graphe d'import
// (base.service <-> metadatas.service) qui casse à l'évaluation sous ts-jest.
// Sans incidence ici : ActorService est entièrement mocké.
jest.mock("src/metadatas/metadatas.service", () => ({
  MetadatasService: class {},
}));

import * as ExcelJS from "exceljs";
import { columnLabels } from "src/applications/columnLabels/application-export.columnLabels";
import { sheetLabels } from "src/applications/constants/application-export.sheet-labels";
import type { PrismaService } from "src/prisma/prisma.service";
import { ActorImportService } from "./actor-import.service";
import type { ActorService } from "./actor.service";

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

async function buildWorkbook(
  rows: Row[],
  opts?: { sheetName?: string; headers?: string[]; extraSheet?: string },
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet(opts?.sheetName ?? sheetLabels.Actors);
  sheet.addRow(opts?.headers ?? DEFAULT_HEADERS);
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
  if (opts?.extraSheet) wb.addWorksheet(opts.extraSheet);
  return Buffer.from(await wb.xlsx.writeBuffer());
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
  const service = new ActorImportService(
    prisma as unknown as PrismaService,
    actorService as unknown as ActorService,
  );
  return { service, prisma, actorService };
}

describe("ActorImportService", () => {
  it("crée un acteur quand l'ID Acteur est absent", async () => {
    const { service, actorService } = setup();
    const buffer = await buildWorkbook([
      {
        applicationId: "app-1",
        firstname: "Jean",
        lastname: "Dupont",
        role: "MOA",
        email: "jean@example.com",
      },
    ]);

    const report = await service.importFromExcel(buffer, "user-1");

    expect(report.summary.created).toBe(1);
    expect(report.summary.errors).toBe(0);
    expect(report.summary.processedSheets).toContain(sheetLabels.Actors);
    expect(actorService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        actorTypeId: "type-1",
        applicationId: "app-1",
      }),
      "app-1",
      "user-1",
    );
    expect(report.entries[0].status).toBe("created");
  });

  it("met à jour un acteur quand l'ID Acteur est présent", async () => {
    const { service, actorService } = setup();
    const buffer = await buildWorkbook([
      { id: "actor-1", applicationId: "app-1", lastname: "Modif", role: "MOA" },
    ]);

    const report = await service.importFromExcel(buffer, "user-1");

    expect(report.summary.updated).toBe(1);
    expect(report.summary.errors).toBe(0);
    expect(actorService.update).toHaveBeenCalledWith(
      "actor-1",
      expect.any(Object),
      "app-1",
      "user-1",
    );
  });

  it("consigne une erreur si l'acteur à mettre à jour est introuvable", async () => {
    const { service, prisma, actorService } = setup();
    prisma.actor.findUnique.mockResolvedValue(null);
    const buffer = await buildWorkbook([
      { id: "missing", applicationId: "app-1", role: "MOA" },
    ]);

    const report = await service.importFromExcel(buffer, "user-1");

    expect(report.summary.errors).toBe(1);
    expect(actorService.update).not.toHaveBeenCalled();
    expect(report.entries[0]).toMatchObject({ status: "error" });
    expect(report.entries[0].message).toMatch(/introuvable/i);
  });

  it("consigne une erreur si l'application est introuvable", async () => {
    const { service, prisma } = setup();
    prisma.application.findUnique.mockResolvedValue(null);
    const buffer = await buildWorkbook([
      { applicationId: "ghost", role: "MOA", email: "a@b.com" },
    ]);

    const report = await service.importFromExcel(buffer, "user-1");

    expect(report.summary.errors).toBe(1);
    expect(report.entries[0].message).toMatch(/Application introuvable/i);
  });

  it("consigne une erreur si le type d'acteur (rôle) est introuvable", async () => {
    const { service, prisma } = setup();
    prisma.actorType.findFirst.mockResolvedValue(null);
    const buffer = await buildWorkbook([
      { applicationId: "app-1", role: "INCONNU", email: "a@b.com" },
    ]);

    const report = await service.importFromExcel(buffer, "user-1");

    expect(report.summary.errors).toBe(1);
    expect(report.entries[0].message).toMatch(/Type d'acteur introuvable/i);
  });

  it("résout le type d'acteur par libellé (colonne Type) si le rôle est vide", async () => {
    const { service, prisma, actorService } = setup();
    // Rôle vide → le lookup par code est sauté ; seule la résolution par libellé est tentée.
    prisma.actorType.findFirst.mockResolvedValue({ id: "type-by-label" });
    const buffer = await buildWorkbook([
      { applicationId: "app-1", type: "Maîtrise d'ouvrage", email: "a@b.com" },
    ]);

    const report = await service.importFromExcel(buffer, "user-1");

    expect(report.summary.created).toBe(1);
    expect(actorService.create).toHaveBeenCalledWith(
      expect.objectContaining({ actorTypeId: "type-by-label" }),
      "app-1",
      "user-1",
    );
  });

  it("consigne une erreur de validation pour un email invalide", async () => {
    const { service, actorService } = setup();
    const buffer = await buildWorkbook([
      { applicationId: "app-1", role: "MOA", email: "pas-un-email" },
    ]);

    const report = await service.importFromExcel(buffer, "user-1");

    expect(report.summary.errors).toBe(1);
    expect(report.entries[0].message).toMatch(/Validation/i);
    expect(actorService.create).not.toHaveBeenCalled();
  });

  it("poursuit le traitement après une ligne fautive", async () => {
    const { service, prisma } = setup();
    // 1ʳᵉ ligne : type résolu ; 2ᵉ ligne : non résolu (code + libellé).
    prisma.actorType.findFirst
      .mockResolvedValueOnce({ id: "type-1" })
      .mockResolvedValue(null);
    const buffer = await buildWorkbook([
      { applicationId: "app-1", role: "MOA", email: "ok@example.com" },
      { applicationId: "app-1", role: "INCONNU", email: "ko@example.com" },
    ]);

    const report = await service.importFromExcel(buffer, "user-1");

    expect(report.summary.created).toBe(1);
    expect(report.summary.errors).toBe(1);
    expect(report.entries).toHaveLength(2);
  });

  it("ignore les lignes entièrement vides", async () => {
    const { service } = setup();
    const buffer = await buildWorkbook([
      {},
      { applicationId: "app-1", role: "MOA", email: "a@b.com" },
    ]);

    const report = await service.importFromExcel(buffer, "user-1");

    expect(report.entries).toHaveLength(1);
    expect(report.summary.created).toBe(1);
  });

  it("ne traite pas l'onglet si une colonne nécessaire manque", async () => {
    const { service } = setup();
    const buffer = await buildWorkbook(
      [{ applicationId: "app-1", role: "MOA" }],
      {
        // En-têtes sans « ID Acteur » (colonne requise).
        headers: [
          columnLabels.applicationId,
          columnLabels["actors.firstname"],
          columnLabels["actors.role"],
        ],
      },
    );

    const report = await service.importFromExcel(buffer, "user-1");

    expect(report.summary.processedSheets).not.toContain(sheetLabels.Actors);
    expect(report.summary.created).toBe(0);
    expect(report.logs.join(" ")).toMatch(/colonnes manquantes/i);
  });

  it("ignore l'onglet Acteurs absent et les onglets inconnus", async () => {
    const { service } = setup();
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet("Feuille inconnue");
    const buffer = Buffer.from(await wb.xlsx.writeBuffer());

    const report = await service.importFromExcel(buffer, "user-1");

    expect(report.summary.ignoredSheets).toContain(sheetLabels.Actors);
    expect(report.summary.ignoredSheets).toContain("Feuille inconnue");
  });

  it("référence l'onglet inconnu en plus de l'onglet Acteurs traité", async () => {
    const { service } = setup();
    const buffer = await buildWorkbook(
      [{ applicationId: "app-1", role: "MOA", email: "a@b.com" }],
      { extraSheet: "Autre" },
    );

    const report = await service.importFromExcel(buffer, "user-1");

    expect(report.summary.processedSheets).toContain(sheetLabels.Actors);
    expect(report.summary.ignoredSheets).toContain("Autre");
  });

  it("consigne une erreur si la colonne ID Application est vide", async () => {
    const { service } = setup();
    const buffer = await buildWorkbook([
      { role: "MOA", email: "a@b.com" }, // applicationId absent
    ]);

    const report = await service.importFromExcel(buffer, "user-1");

    expect(report.summary.errors).toBe(1);
    expect(report.entries[0].message).toMatch(/ID Application/i);
  });

  it("coerce les cellules non textuelles (nombre, date, richText, hyperlien)", async () => {
    const { service, actorService } = setup();
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet(sheetLabels.Actors);
    sheet.addRow(DEFAULT_HEADERS);
    const row = sheet.addRow([]);
    row.getCell(1).value = "app-1"; // ID Application
    row.getCell(4).value = { richText: [{ text: "Jean" }, { text: "-Luc" }] };
    row.getCell(5).value = new Date("2020-01-02T00:00:00.000Z"); // Nom (date)
    row.getCell(6).value = "MOA"; // Rôle
    row.getCell(7).value = 7; // Type (nombre, lu mais non utilisé ici)
    row.getCell(8).value = {
      text: "rich@example.com",
      hyperlink: "mailto:rich@example.com",
    };
    const buffer = Buffer.from(await wb.xlsx.writeBuffer());

    const report = await service.importFromExcel(buffer, "user-1");

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

  it("rejette un fichier non Excel", async () => {
    const { service } = setup();
    await expect(
      service.importFromExcel(Buffer.from("pas un xlsx"), "user-1"),
    ).rejects.toThrow(/Excel/i);
  });
});
