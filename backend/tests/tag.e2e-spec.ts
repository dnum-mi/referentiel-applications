import type { UserFakerReturnType } from "./fakers/user.faker";
import { faker } from "@faker-js/faker/.";
import { AdminLevel } from "src/user/entities/user.entity";
import request from "supertest";
import { TagFaker } from "./fakers/tag.faker";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

describe("Tags", () => {
  const app = setupTestSuite();
  let user: UserFakerReturnType;
  let TOKEN: string;

  beforeAll(async () => {
    user = await UserFaker.create({ adminLevel: AdminLevel.ADMIN });
    TOKEN = await getToken(user);
  });

  it("/POST tags", async () => {
    await request(app().getHttpServer())
      .post("/tags")
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({
        name: `${faker.word.noun({ length: { min: 2, max: 128 } }).replace(/[^a-z._-]/g, "")}`,
      })
      .expect(201);
  });

  it("/GET tags", async () => {
    await request(app().getHttpServer())
      .get("/tags")
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);
  });

  it("/GET tags/:id", async () => {
    const tag = await TagFaker.create();
    await request(app().getHttpServer())
      .get(`/tags/${tag.id}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);
  });

  it("/PATCH tags/:id", async () => {
    const tag = await TagFaker.create();
    await request(app().getHttpServer())
      .patch(`/tags/${tag.id}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({ name: `updated_${faker.word.noun({ length: { min: 2, max: 128 } }).replace(/[^a-z._-]/g, "")}` })
      .expect(200);
  });

  it("/DELETE tags/:id", async () => {
    const tag = await TagFaker.create();
    await request(app().getHttpServer())
      .delete(`/tags/${tag.id}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(204);
  });
});
