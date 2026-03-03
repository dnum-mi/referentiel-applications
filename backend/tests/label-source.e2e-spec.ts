import type { UserFakerReturnType } from "./fakers/user.faker";
import { AdminLevel } from "src/user/entities/user.entity";
import request from "supertest";
import { LabelSourceFaker } from "./fakers/label-source.faker";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";
import { faker } from "@faker-js/faker/.";

describe("LabelSources", () => {
  const app = setupTestSuite();
  let user: UserFakerReturnType;
  let TOKEN: string;

  beforeAll(async () => {
    user = await UserFaker.create({ adminLevel: AdminLevel.ADMIN });
    TOKEN = await getToken(user);
  });

  it("/GET label-sources", async () => {
    await request(app().getHttpServer())
      .get("/label-sources")
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);
  });

  it("/POST label-sources", async () => {
    await request(app().getHttpServer())
      .post("/label-sources")
      .send({ source: `${faker.string.alpha({ length: 6 }).toUpperCase()}` })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(201);
  });

  it("/PATCH label-sources/:id", async () => {
    const labelSource = await LabelSourceFaker.create();
    await request(app().getHttpServer())
      .patch(`/label-sources/${labelSource.id}`)
      .send({ source: `${faker.string.alpha({ length: 6 }).toUpperCase()}` })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);
  });

  it("filters label-sources by source", async () => {
    const labelSource = await LabelSourceFaker.create();
    const response = await request(app().getHttpServer())
      .get(`/label-sources?source=${labelSource.source}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);
    expect(Array.isArray(response.body.results)).toBe(true);
    expect(response.body.results.some((l) => l.id === labelSource.id)).toBe(
      true,
    );
  });

  it("/DELETE label-sources/:id", async () => {
    const labelSource = await LabelSourceFaker.create();
    await request(app().getHttpServer())
      .delete(`/label-sources/${labelSource.id}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(204);
  });
});
