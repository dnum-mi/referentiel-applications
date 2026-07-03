import type { UserFakerReturnType } from "./fakers/user.faker";
import { Roles } from "@prisma/client";
import request from "supertest";
import { ApplicationFaker } from "./fakers/application.faker";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

describe("Technologies", () => {
  const app = setupTestSuite();
  let application: { id: string };
  let user: UserFakerReturnType;
  let TOKEN: string;

  beforeAll(async () => {
    user = await UserFaker.create({ role: Roles.CONTRIBUTOR });
    TOKEN = await getToken(user);
    application = await ApplicationFaker.create(user);
  });

  it("GET /applications/:applicationId/technologies - retourne liste vide initialement", async () => {
    const response = await request(app().getHttpServer())
      .get(`/applications/${application.id}/technologies`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(0);
  });

  it("POST /applications/:applicationId/technologies - ajoute une technologie", async () => {
    const response = await request(app().getHttpServer())
      .post(`/applications/${application.id}/technologies`)
      .send({ technology: "Node.js", version: "20.11" })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(201);

    expect(response.body.id).toBeDefined();
    expect(response.body.applicationId).toEqual(application.id);
    expect(response.body.technology).toEqual("Node.js");
    expect(response.body.version).toEqual("20.11");
  });

  it("POST /applications/:applicationId/technologies - ajoute une deuxième technologie", async () => {
    const response = await request(app().getHttpServer())
      .post(`/applications/${application.id}/technologies`)
      .send({ technology: "PostgreSQL" })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(201);

    expect(response.body.id).toBeDefined();
    expect(response.body.technology).toEqual("PostgreSQL");
  });

  it("GET /applications/:applicationId/technologies - retourne les deux technologies", async () => {
    const response = await request(app().getHttpServer())
      .get(`/applications/${application.id}/technologies`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    expect(response.body).toHaveLength(2);
  });

  it("POST - rejette un doublon de technologie sur la même application", async () => {
    await request(app().getHttpServer())
      .post(`/applications/${application.id}/technologies`)
      .send({ technology: "Node.js", version: "18.0" })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(409);
  });

  it("PATCH /applications/:applicationId/technologies/:id - met à jour une technologie", async () => {
    const list = await request(app().getHttpServer())
      .get(`/applications/${application.id}/technologies`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    const target = list.body.find(
      (t: { technology: string }) => t.technology === "Node.js",
    );

    const response = await request(app().getHttpServer())
      .patch(`/applications/${application.id}/technologies/${target.id}`)
      .send({ technology: "Node.js", version: "22.0" })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    expect(response.body.version).toEqual("22.0");
    expect(response.body.id).toEqual(target.id);
  });

  it("DELETE /applications/:applicationId/technologies/:id - supprime une technologie", async () => {
    const list = await request(app().getHttpServer())
      .get(`/applications/${application.id}/technologies`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    const target = list.body[0];

    await request(app().getHttpServer())
      .delete(`/applications/${application.id}/technologies/${target.id}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(204);

    const afterDelete = await request(app().getHttpServer())
      .get(`/applications/${application.id}/technologies`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    expect(afterDelete.body).toHaveLength(1);
  });
});
