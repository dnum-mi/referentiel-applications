import { Permission, Roles } from "@prisma/client";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { UpdateUserDto, UpdateUserPreferencesDto } from "./update-user.dto";

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
      Permission.TechnologyList,
      Permission.GristSync,
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

describe("UpdateUserPreferencesDto — gristDocIds", () => {
  const errorsFor = (gristDocIds: unknown) =>
    validate(plainToInstance(UpdateUserPreferencesDto, { gristDocIds }));

  it("accepte des identifiants de document Grist", async () => {
    expect(await errorsFor(["aBc123XyZ456", "doc_id-2"])).toHaveLength(0);
  });

  it.each([
    ["une URL", ["https://grist.numerique.gouv.fr/aBc123XyZ456"]],
    ["un identifiant trop court", ["abc"]],
    ["un identifiant avec espaces", ["abc def ghi"]],
    ["autre chose qu'une liste", "aBc123XyZ456"],
    [
      "plus de 20 documents",
      Array.from({ length: 21 }, (_, i) => `doc-${i}00`),
    ],
  ])("refuse %s", async (_, value) => {
    const errors = await errorsFor(value);
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe("gristDocIds");
  });
});

describe("UpdateUserPreferencesDto — instance et clé Grist", () => {
  const errorsFor = (body: object) =>
    validate(plainToInstance(UpdateUserPreferencesDto, body));

  it("accepte une URL HTTPS, une clé, et null pour les effacer", async () => {
    expect(
      await errorsFor({
        gristUrl: "https://grist.numerique.gouv.fr/o/docs/abc",
        gristApiKey: "0123456789abcdef",
      }),
    ).toHaveLength(0);
    expect(await errorsFor({ gristUrl: null, gristApiKey: null })).toHaveLength(
      0,
    );
  });

  it.each([
    ["une URL HTTP", { gristUrl: "http://grist.example" }, "gristUrl"],
    ["autre chose qu'une URL", { gristUrl: "grist" }, "gristUrl"],
    ["une clé vide", { gristApiKey: "" }, "gristApiKey"],
    ["une clé avec espaces", { gristApiKey: "abc def" }, "gristApiKey"],
  ])("refuse %s", async (_, body, property) => {
    const errors = await errorsFor(body);
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe(property);
  });
});
