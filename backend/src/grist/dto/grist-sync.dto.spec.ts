import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { GristSyncDto } from "./grist-sync.dto";

describe("GristSyncDto", () => {
  const errorsFor = (body: object) =>
    validate(plainToInstance(GristSyncDto, body));

  it("accepte un corps vide : documents du profil, première table", async () => {
    expect(await errorsFor({})).toHaveLength(0);
  });

  it.each(["RefApp", "RefApp2", "RefApp12"])(
    "accepte la table %s",
    async (tableId) => {
      expect(
        await errorsFor({ targets: [{ docId: "doc123", tableId }] }),
      ).toHaveLength(0);
    },
  );

  it.each(["Autre", "RefApp1", "RefApp02", "refapp2", "RefApp2;"])(
    "refuse la table %s",
    async (tableId) => {
      expect(
        await errorsFor({ targets: [{ docId: "doc123", tableId }] }),
      ).not.toHaveLength(0);
    },
  );

  it.each([
    ["une liste vide", { targets: [] }],
    ["un identifiant de document mal formé", { targets: [{ docId: "a/b" }] }],
    ["newTable non booléen", { targets: [{ docId: "doc123", newTable: 1 }] }],
    [
      "plus de 20 cibles",
      { targets: Array.from({ length: 21 }, () => ({ docId: "doc123" })) },
    ],
  ])("refuse %s", async (_, body) => {
    expect(await errorsFor(body)).not.toHaveLength(0);
  });
});
