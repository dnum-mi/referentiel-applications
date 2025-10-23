import { AdminLevel } from "src/user/entities/user.entity";
import request from "supertest";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

describe("AppController (e2e)", () => {
  const app = setupTestSuite();

  it("/ (GET)", async () => {
    const user = await UserFaker.create({ adminLevel: AdminLevel.READ });
    const TOKEN = await getToken(user);
    await request(app().getHttpServer())
      .get("/")
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200)
      .expect("Hello World!");
  });
});
