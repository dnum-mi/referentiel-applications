import { Permission } from "@prisma/client";
import { REQUIRED_PERMISSIONS } from "src/common/decorators/required-permissions.decorator";
import { PermissionGuard } from "src/common/guards/permission.guard";
import { TechnicalDebtController } from "./technical-debt.controller";

// #2502 : les routes /technical-debts doivent porter la garde ET la permission MDITList,
// comme le front (TimePage) le laisse croire — auparavant elles étaient ouvertes à tout
// utilisateur authentifié.
describe("TechnicalDebtController — permissions", () => {
  it("applique PermissionGuard sur le contrôleur", () => {
    const guards: unknown[] =
      Reflect.getMetadata("__guards__", TechnicalDebtController) ?? [];
    expect(guards).toContain(PermissionGuard);
  });

  it.each(["getTechnicalDebtPoints", "getMillesimes"] as const)(
    "exige MDITList sur %s",
    (handler) => {
      const required: Permission[] = Reflect.getMetadata(
        REQUIRED_PERMISSIONS,
        TechnicalDebtController.prototype[handler],
      );
      expect(required).toEqual([Permission.MDITList]);
    },
  );
});
