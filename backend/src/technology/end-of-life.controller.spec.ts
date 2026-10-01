import { Permission } from "@prisma/client";
import { REQUIRED_PERMISSIONS } from "src/common/decorators/required-permissions.decorator";
import { PermissionGuard } from "src/common/guards/permission.guard";
import { EndOfLifeController } from "./end-of-life.controller";

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
});
