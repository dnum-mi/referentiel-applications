import { Roles } from "@prisma/client";
import request from "supertest";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";
import { Permission } from "@prisma/client";

describe("Reports", () => {
  const app = setupTestSuite();
  let user: Awaited<ReturnType<typeof UserFaker.create>>;
  let TOKEN: string;

  beforeAll(async () => {
    user = await UserFaker.create({ role: Roles.READER });
    TOKEN = await getToken(user);
  });

  it("/GET reports", async () => {
    return request(app().getHttpServer())
      .get("/reports")
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);
  });

  it("/POST reports, without permissions", async () => {
    return request(app().getHttpServer())
      .post("/reports")
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({
        description: "Test report",
      })
      .expect(403);
  });

  it("/POST reports", async () => {
    await user.update({
      additionalPermissions: [Permission.CreateGlobalReport],
    });
    return request(app().getHttpServer())
      .post("/reports")
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({
        description: "Test report",
      })
      .expect(201);
  });
});
