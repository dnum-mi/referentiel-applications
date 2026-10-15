import { Permission } from "@prisma/client";
import { REQUIRED_PERMISSIONS } from "src/common/decorators/required-permissions.decorator";
import { PermissionGuard } from "src/common/guards/permission.guard";
import { EndOfLifeController } from "./end-of-life.controller";
import type { EndOfLifeService } from "./end-of-life.service";
import type { CheckPermissions } from "src/common/service/check-permissions.service";
import type { Requestor } from "src/user/entities/user.entity";
import { ForbiddenException } from "@nestjs/common";

describe("EndOfLifeController — capacité Technologie (#2801)", () => {
  it("protège la route avec PermissionGuard", () => {
    const guards: unknown[] =
      Reflect.getMetadata("__guards__", EndOfLifeController) ?? [];
    expect(guards).toContain(PermissionGuard);
  });

  it("exige la capacité globale TechnologyList, indépendante de TechnologyRead", () => {
    const required: Permission[] = Reflect.getMetadata(
      REQUIRED_PERMISSIONS,
      EndOfLifeController.prototype.findEndOfLifeApplications,
    );
    expect(required).toEqual([Permission.TechnologyList]);
  });

  it("exige aussi TechnologyList pour l'export, indépendamment de DataExport", () => {
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS,
        EndOfLifeController.prototype.exportEndOfLifeApplications,
      ),
    ).toEqual([Permission.TechnologyList]);
  });

  it("refuse l'export sans DataExport avant de lire les données", async () => {
    const exportApplications = jest.fn();
    const can = jest.fn().mockResolvedValue(false);
    const controller = new EndOfLifeController(
      { exportApplications } as unknown as EndOfLifeService,
      { can } as unknown as CheckPermissions,
    );
    const requestor = { id: "user-1" } as Requestor;

    await expect(
      controller.exportEndOfLifeApplications({}, requestor),
    ).rejects.toThrow(ForbiddenException);
    expect(can).toHaveBeenCalledWith([Permission.DataExport], requestor);
    expect(exportApplications).not.toHaveBeenCalled();
  });

  it("envoie le XLSX avec ses en-têtes de téléchargement", async () => {
    const filters = { status: "all" as const, search: "PostgreSQL" };
    const requestor = { id: "user-1" } as Requestor;
    const exportApplications = jest.fn().mockResolvedValue(Buffer.from("xlsx"));
    const controller = new EndOfLifeController(
      { exportApplications } as unknown as EndOfLifeService,
      { can: jest.fn().mockResolvedValue(true) } as unknown as CheckPermissions,
    );

    const file = await controller.exportEndOfLifeApplications(
      filters,
      requestor,
    );
    expect(exportApplications).toHaveBeenCalledWith(filters, requestor);
    expect(file.getHeaders()).toMatchObject({
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      disposition: 'attachment; filename="technologies_export.xlsx"',
    });
  });
});
