import { Roles } from "@prisma/client";
import request from "supertest";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

/**
 * PATCH /actorTypes/perms-matrix : le corps est un tableau. Le ValidationPipe global ne valide
 * pas les éléments d'un tableau, qui partaient tels quels dans Prisma (500). Le corps est
 * désormais validé élément par élément (ParseArrayPipe).
 */
describe("PATCH /actorTypes/perms-matrix (validation du corps)", () => {
  const app = setupTestSuite();
  let ADMIN_TOKEN: string;

  beforeAll(async () => {
    const admin = await UserFaker.create({ role: Roles.ADMIN });
    ADMIN_TOKEN = await getToken(admin);
  });

  it.each([
    ["objet au lieu d'un tableau", { actorTypeId: "x", AppRead: true }],
    ["permission non booléenne", [{ actorTypeId: "x", AppRead: "oui" }]],
    ["champ inconnu", [{ actorTypeId: "x", unknownField: true }]],
  ])("rejects an invalid body (%s) with 400", async (_label, body) => {
    await request(app().getHttpServer())
      .patch("/actorTypes/perms-matrix")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send(body)
      .expect(400);
  });
});
