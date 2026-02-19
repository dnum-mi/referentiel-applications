import { AdminLevel } from "src/user/entities/user.entity";
import request from "supertest";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

describe("Reports", () => {
  const app = setupTestSuite();
  let user: Awaited<ReturnType<typeof UserFaker.create>>;
  let TOKEN: string;

  beforeAll(async () => {
    user = await UserFaker.create({ adminLevel: AdminLevel.READ });
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
    await user.update({ capabilities: ["CreateGlobalReport"] });
    return request(app().getHttpServer())
      .post("/reports")
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({
        description: "Test report",
      })
      .expect(201);
  });
});
