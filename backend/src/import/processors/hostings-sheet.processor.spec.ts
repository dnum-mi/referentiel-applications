// Neutralise une dépendance circulaire préexistante du graphe d'import
// (base.service <-> metadatas.service) qui casse à l'évaluation sous ts-jest.
jest.mock("src/metadatas/metadatas.service", () => ({
  MetadatasService: class {},
}));

import * as ExcelJS from "exceljs";
import { sheetLabels } from "src/applications/constants/application-export.sheet-labels";
import type { HostingsService } from "src/hostings/hostings.service";
import type { PrismaService } from "src/prisma/prisma.service";
import { createEmptyReport } from "../dto/import-report.dto";
import { HostingsSheetProcessor } from "./hostings-sheet.processor";

/** Les ID d'application sont des UUID en base (cf. schema) → requis par CreateHostingDto. */
const APP_UUID = "11111111-1111-4111-8111-111111111111";

function buildSheet(
  headers: string[],
  rows: (string | number)[][],
): ExcelJS.Worksheet {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet(sheetLabels.Hostings);
  sheet.addRow(headers);
  for (const r of rows) sheet.addRow(r);
  return sheet;
}

function setup() {
  const prisma = {
    application: {
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        where.id === APP_UUID ? { id: APP_UUID } : null,
      ),
    },
    hosting: {
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        where.id === "host-1" ? { id: "host-1" } : null,
      ),
    },
    hostingOption: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: "opt-1" }),
    },
  };
  const hostingsService = {
    createHosting: jest.fn().mockResolvedValue({ id: "new-host" }),
    updateHosting: jest.fn().mockResolvedValue({ id: "host-1" }),
  };
  const processor = new HostingsSheetProcessor(
    prisma as unknown as PrismaService,
    hostingsService as unknown as HostingsService,
  );
  return { processor, prisma, hostingsService };
}

const HEADERS = [
  "ID Hébergement",
  "ID Application",
  "Label d’hébergement",
  "Fournisseur d’hébergement",
  "Site",
  "Plateforme",
];

describe("HostingsSheetProcessor", () => {
  it("crée un hébergement en créant l'option d'hébergement absente", async () => {
    const { processor, prisma, hostingsService } = setup();
    const report = createEmptyReport();
    await processor.process(
      buildSheet(HEADERS, [
        ["", APP_UUID, "Prod", "DTNUM", "RENNES", "PHYSIQUE"],
      ]),
      "user-1",
      report,
    );

    expect(report.summary.created).toBe(1);
    expect(report.summary.errors).toBe(0);
    expect(prisma.hostingOption.create).toHaveBeenCalledTimes(1);
    expect(hostingsService.createHosting).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationId: APP_UUID,
        hostingOptionId: "opt-1",
      }),
      "user-1",
    );
  });

  it("réutilise une option d'hébergement existante (pas de création)", async () => {
    const { processor, prisma } = setup();
    prisma.hostingOption.findFirst.mockResolvedValue({ id: "opt-existing" });
    const report = createEmptyReport();
    await processor.process(
      buildSheet(HEADERS, [
        ["", APP_UUID, "Prod", "DTNUM", "RENNES", "PHYSIQUE"],
      ]),
      "user-1",
      report,
    );

    expect(report.summary.created).toBe(1);
    expect(prisma.hostingOption.create).not.toHaveBeenCalled();
  });

  it("met à jour un hébergement existant", async () => {
    const { processor, hostingsService } = setup();
    const report = createEmptyReport();
    await processor.process(
      buildSheet(HEADERS, [
        ["host-1", APP_UUID, "Prod", "DTNUM", "RENNES", "PHYSIQUE"],
      ]),
      "user-1",
      report,
    );

    expect(report.summary.updated).toBe(1);
    expect(hostingsService.updateHosting).toHaveBeenCalledWith(
      "host-1",
      expect.objectContaining({ applicationId: APP_UUID }),
      "user-1",
    );
  });

  it("consigne une erreur quand l'application est introuvable", async () => {
    const { processor } = setup();
    const report = createEmptyReport();
    await processor.process(
      buildSheet(HEADERS, [
        ["", "ghost", "Prod", "DTNUM", "RENNES", "PHYSIQUE"],
      ]),
      "user-1",
      report,
    );

    expect(report.summary.errors).toBe(1);
    expect(report.entries[0].message).toMatch(/Application introuvable/i);
  });

  it("consigne une erreur quand l'hébergement à mettre à jour est introuvable", async () => {
    const { processor } = setup();
    const report = createEmptyReport();
    await processor.process(
      buildSheet(HEADERS, [
        ["ghost-host", APP_UUID, "Prod", "DTNUM", "RENNES", "PHYSIQUE"],
      ]),
      "user-1",
      report,
    );

    expect(report.summary.errors).toBe(1);
    expect(report.entries[0].message).toMatch(/Hébergement introuvable/i);
  });

  it("ne traite pas l'onglet sans la colonne ID Hébergement", async () => {
    const { processor } = setup();
    const report = createEmptyReport();
    await processor.process(
      buildSheet(
        ["ID Application", "Fournisseur d’hébergement"],
        [[APP_UUID, "DTNUM"]],
      ),
      "user-1",
      report,
    );

    expect(report.summary.processedSheets).not.toContain(sheetLabels.Hostings);
    expect(report.logs.join(" ")).toMatch(/colonnes manquantes/i);
  });
});
