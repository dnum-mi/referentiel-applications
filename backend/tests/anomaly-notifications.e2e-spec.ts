import request from "supertest";
import { setupTestSuite } from "./setup";
import { getToken } from "./getToken";
import { UserFaker } from "./fakers/user.faker";
import { AdminLevel } from "src/user/entities/user.entity";

describe("Anomaly Notifications", () => {
  const app = setupTestSuite();
  let user: Awaited<ReturnType<typeof UserFaker.create>>;
  let TOKEN: string;

  beforeAll(async () => {
    user = await UserFaker.create({ adminLevel: AdminLevel.READ });
    TOKEN = await getToken(user);
  });

  it("/GET anomaly-notifications", async () => {
    return request(app().getHttpServer())
      .get("/anomaly-notifications")
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);
  });

  it("/POST anomaly-notifications, without permissions", async () => {
    return request(app().getHttpServer())
      .post("/anomaly-notifications")
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({
        description: "Test anomaly notification",
      })
      .expect(403);
  });

  it("/POST anomaly-notifications", async () => {
    await user.update({ capabilities: ["CreateGlobalAnomalyNotification"] });
    return request(app().getHttpServer())
      .post("/anomaly-notifications")
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({
        description: "Test anomaly notification",
      })
      .expect(201);
  });
});
