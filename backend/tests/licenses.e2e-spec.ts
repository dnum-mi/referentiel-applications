import type { UserFakerReturnType } from "./fakers/user.faker";
import { Roles } from "@prisma/client";
import request from "supertest";
import { ApplicationFaker } from "./fakers/application.faker";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

describe("Licenses", () => {
  const app = setupTestSuite();
  let application: { id: string };
  let user: UserFakerReturnType;
  let TOKEN: string;

  beforeAll(async () => {
    user = await UserFaker.create({ role: Roles.CONTRIBUTOR });
    TOKEN = await getToken(user);
    application = await ApplicationFaker.create(user);
  });

  it("GET /applications/:applicationId/licenses - retourne liste vide initialement", async () => {
    const response = await request(app().getHttpServer())
      .get(`/applications/${application.id}/licenses`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(0);
  });

  it("POST /applications/:applicationId/licenses - ajoute une licence", async () => {
    const response = await request(app().getHttpServer())
      .post(`/applications/${application.id}/licenses`)
      .send({ name: "MIT" })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(201);

    expect(response.body.id).toBeDefined();
    expect(response.body.applicationId).toEqual(application.id);
    expect(response.body.name).toEqual("MIT");
  });

  it("POST /applications/:applicationId/licenses - ajoute une deuxième licence", async () => {
    const response = await request(app().getHttpServer())
      .post(`/applications/${application.id}/licenses`)
      .send({ name: "Apache-2.0", version: "2.0" })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(201);

    expect(response.body.id).toBeDefined();
    expect(response.body.name).toEqual("Apache-2.0");
  });

  it("GET /applications/:applicationId/licenses - retourne les deux licences", async () => {
    const response = await request(app().getHttpServer())
      .get(`/applications/${application.id}/licenses`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    expect(response.body).toHaveLength(2);
  });

  it("POST - rejette un doublon de licence sur la même application", async () => {
    await request(app().getHttpServer())
      .post(`/applications/${application.id}/licenses`)
      .send({ name: "MIT" })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(409);
  });

  it("PATCH /applications/:applicationId/licenses/:id - met à jour une licence", async () => {
    const list = await request(app().getHttpServer())
      .get(`/applications/${application.id}/licenses`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    const target = list.body.find(
      (l: { name: string }) => l.name === "Apache-2.0",
    );

    const response = await request(app().getHttpServer())
      .patch(`/applications/${application.id}/licenses/${target.id}`)
      .send({ name: "Apache-2.0", version: "2.1" })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    expect(response.body.version).toEqual("2.1");
    expect(response.body.id).toEqual(target.id);
  });

  it("DELETE /applications/:applicationId/licenses/:id - supprime une licence", async () => {
    const list = await request(app().getHttpServer())
      .get(`/applications/${application.id}/licenses`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    const target = list.body[0];

    await request(app().getHttpServer())
      .delete(`/applications/${application.id}/licenses/${target.id}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(204);

    const afterDelete = await request(app().getHttpServer())
      .get(`/applications/${application.id}/licenses`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    expect(afterDelete.body).toHaveLength(1);
  });
});
