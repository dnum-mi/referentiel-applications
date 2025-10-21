import request from "supertest";
import { setupTestSuite } from "./setup";
import { getToken } from "./getToken";
import { UserFaker } from "./fakers/user.faker";
import { AdminLevel } from "src/user/entities/user.entity";

describe("Anomaly Notifications", () => {
  const app = setupTestSuite();

  it("/GET anomaly-notifications", async () => {
    const user = await UserFaker.create({ adminLevel: AdminLevel.WRITE });
    const TOKEN = await getToken(user);
    return request(app().getHttpServer())
      .get("/anomaly-notifications")
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);
  });
});
