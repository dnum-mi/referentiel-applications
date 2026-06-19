// Neutralise une dépendance circulaire préexistante du graphe d'import
// (base.service <-> metadatas.service) qui casse à l'évaluation sous ts-jest.
jest.mock("src/metadatas/metadatas.service", () => ({
  MetadatasService: class {},
}));

import { BadRequestException } from "@nestjs/common";
import { ActorController } from "./actor.controller";
import type { ActorImportService } from "./actor-import.service";
import type { ActorService } from "./actor.service";
import type { ImportReportDto } from "./dto/import-report.dto";

const REPORT: ImportReportDto = {
  summary: {
    processedSheets: ["Acteurs"],
    ignoredSheets: [],
    created: 1,
    updated: 0,
    errors: 0,
  },
  entries: [],
  logs: [],
};

function setup(importImpl?: jest.Mock) {
  const importService = {
    importFromExcel: importImpl ?? jest.fn().mockResolvedValue(REPORT),
  };
  const controller = new ActorController(
    {} as unknown as ActorService,
    importService as unknown as ActorImportService,
  );
  return { controller, importService };
}

const xlsxFile = {
  buffer: Buffer.from("x"),
  originalname: "import.xlsx",
  mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

describe("ActorController.importExcel", () => {
  it("rejette quand aucun fichier n'est fourni", async () => {
    const { controller } = setup();
    await expect(controller.importExcel(undefined, "user-1")).rejects.toThrow(
      BadRequestException,
    );
  });

  it("rejette un fichier qui n'est pas un .xlsx", async () => {
    const { controller } = setup();
    await expect(
      controller.importExcel(
        {
          buffer: Buffer.from("x"),
          originalname: "x.txt",
          mimetype: "text/plain",
        },
        "user-1",
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("traite un .xlsx et renvoie le rapport", async () => {
    const { controller, importService } = setup();
    const result = await controller.importExcel(xlsxFile, "user-1");
    expect(importService.importFromExcel).toHaveBeenCalledWith(
      xlsxFile.buffer,
      "user-1",
    );
    expect(result.summary.created).toBe(1);
  });

  it("convertit une erreur du service en BadRequest", async () => {
    const { controller } = setup(
      jest.fn().mockRejectedValue(new Error("fichier illisible")),
    );
    await expect(controller.importExcel(xlsxFile, "user-1")).rejects.toThrow(
      /fichier illisible/,
    );
  });
});
