import { validate } from "class-validator";
import { Permission, Roles } from "@prisma/client";
import { CreateServiceTokenDto } from "./token.dto";
import { DELEGABLE_PERMISSIONS } from "src/permissions/role-to-permissions";

describe("CreateServiceTokenDto — capacités supplémentaires", () => {
  it.each(
    [undefined, [], [...DELEGABLE_PERMISSIONS]].map(
      (additionalPermissions) => ({ additionalPermissions }),
    ),
  )(
    "accepte les capacités déléguables : %j",
    async ({ additionalPermissions }) => {
      const dto = Object.assign(new CreateServiceTokenDto(), {
        name: "Service",
        description: "Test",
        role: Roles.READER,
        expiresAt: "2027-01-01T00:00:00.000Z",
        additionalPermissions,
      });
      expect(await validate(dto)).toHaveLength(0);
    },
  );

  it.each(
    [
      [Permission.GlobalAdminManage],
      [Permission.AppWrite],
      ["inconnue"],
      Permission.DataExport,
    ].map((additionalPermissions) => ({ additionalPermissions })),
  )(
    "refuse une capacité non déléguable ou un format invalide : %j",
    async ({ additionalPermissions }) => {
      const dto = Object.assign(new CreateServiceTokenDto(), {
        name: "Service",
        description: "Test",
        role: Roles.READER,
        expiresAt: "2027-01-01T00:00:00.000Z",
        additionalPermissions,
      });
      expect((await validate(dto)).map((error) => error.property)).toContain(
        "additionalPermissions",
      );
    },
  );
});
