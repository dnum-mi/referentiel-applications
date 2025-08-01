import request from "supertest";
import { setupTestSuite } from "./setup";
import { getToken } from "./getToken";
import { UserFaker } from "./fakers/user.faker";
import { getPrismaClient } from "./fakers/prisma";
import { AdminLevel } from "src/user/entities/user.entity";

describe("AppController (e2e)", () => {
  const app = setupTestSuite();
  const prisma = getPrismaClient();
  afterAll(async () => {
    prisma.$disconnect();
  });

  it("/ (GET)", async () => {
    const user = await UserFaker.create(AdminLevel.READ);
    const TOKEN = await getToken(user);
    await request(app().getHttpServer())
      .get("/")
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200)
      .expect("Hello World!");
  });
});
