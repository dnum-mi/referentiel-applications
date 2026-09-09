import { Permission, Roles } from "@prisma/client";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { UpdateUserDto } from "./update-user.dto";

// #2498 : `additionalPermissions` est une liste FERMÉE de permissions déléguables.
describe("UpdateUserDto — additionalPermissions", () => {
  async function errorsFor(additionalPermissions: unknown) {
    const dto = plainToInstance(UpdateUserDto, {
      role: Roles.CONTRIBUTOR,
      additionalPermissions,
    });
    return validate(dto);
  }

  it("accepte une liste de permissions déléguables", async () => {
    const errors = await errorsFor([
      Permission.CreateApplication,
      Permission.DataExport,
      Permission.QualityCampaignManage,
      Permission.MditCampaignManage,
    ]);
    expect(errors).toHaveLength(0);
  });

  it("accepte une liste vide", async () => {
    expect(await errorsFor([])).toHaveLength(0);
  });

  it("refuse AdminPanelManage (non déléguable)", async () => {
    const errors = await errorsFor([Permission.AdminPanelManage]);
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe("additionalPermissions");
    expect(Object.keys(errors[0].constraints ?? {})).toContain("isIn");
  });

  it("refuse une permission applicative (AppWrite) et DeleteApplication", async () => {
    expect(await errorsFor([Permission.AppWrite])).toHaveLength(1);
    expect(await errorsFor([Permission.DeleteApplication])).toHaveLength(1);
  });

  it("refuse une valeur hors enum", async () => {
    const errors = await errorsFor(["SuperAdmin"]);
    expect(errors).toHaveLength(1);
    expect(Object.keys(errors[0].constraints ?? {})).toContain("isEnum");
  });

  it("refuse une valeur qui n'est pas un tableau", async () => {
    const errors = await errorsFor("CreateApplication");
    expect(errors).toHaveLength(1);
    expect(Object.keys(errors[0].constraints ?? {})).toContain("isArray");
  });
});
