import type { UserFakerReturnType } from "./fakers/user.faker";
import { Roles } from "@prisma/client";
import request from "supertest";
import { ApplicationFaker } from "./fakers/application.faker";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

describe("RGAA Compliances", () => {
  const app = setupTestSuite();
  let application: { id: string };
  let user: UserFakerReturnType;
  let TOKEN: string;

  beforeAll(async () => {
    user = await UserFaker.create({ role: Roles.CONTRIBUTOR });
    TOKEN = await getToken(user);
    application = await ApplicationFaker.create(user);
  });

  it("GET /applications/:applicationId/rgaa-compliances - retourne liste vide initialement", async () => {
    const response = await request(app().getHttpServer())
      .get(`/applications/${application.id}/rgaa-compliances`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(0);
  });

  it("POST /applications/:applicationId/rgaa-compliances - crée une conformité RGAA", async () => {
    const response = await request(app().getHttpServer())
      .post(`/applications/${application.id}/rgaa-compliances`)
      .send({
        service_url: "https://service-a.example.gouv.fr",
        accessibility_url: "https://service-a.example.gouv.fr/accessibilite",
        score_percentage: 75.5,
        audit_date: "2024-01-15T00:00:00.000Z",
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(201);

    expect(response.body.id).toBeDefined();
    expect(response.body.applicationId).toEqual(application.id);
    expect(response.body.service_url).toEqual(
      "https://service-a.example.gouv.fr",
    );
    expect(response.body.score_percentage).toEqual(75.5);
  });

  it("POST /applications/:applicationId/rgaa-compliances - crée une deuxième conformité RGAA sur une autre URL", async () => {
    const response = await request(app().getHttpServer())
      .post(`/applications/${application.id}/rgaa-compliances`)
      .send({
        service_url: "https://service-b.example.gouv.fr",
        score_percentage: 90,
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(201);

    expect(response.body.id).toBeDefined();
    expect(response.body.service_url).toEqual(
      "https://service-b.example.gouv.fr",
    );
  });

  it("GET /applications/:applicationId/rgaa-compliances - retourne les deux conformités", async () => {
    const response = await request(app().getHttpServer())
      .get(`/applications/${application.id}/rgaa-compliances`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    expect(response.body).toHaveLength(2);
  });

  it("POST - rejette un doublon d'URL sur la même application", async () => {
    await request(app().getHttpServer())
      .post(`/applications/${application.id}/rgaa-compliances`)
      .send({
        service_url: "https://service-a.example.gouv.fr",
        score_percentage: 50,
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(409);
  });

  it("PATCH /applications/:applicationId/rgaa-compliances/:id - met à jour une conformité", async () => {
    const list = await request(app().getHttpServer())
      .get(`/applications/${application.id}/rgaa-compliances`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    const target = list.body[0];

    const response = await request(app().getHttpServer())
      .patch(`/applications/${application.id}/rgaa-compliances/${target.id}`)
      .send({ score_percentage: 99 })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    expect(response.body.score_percentage).toEqual(99);
    expect(response.body.id).toEqual(target.id);
  });

  it("DELETE /applications/:applicationId/rgaa-compliances/:id - supprime une conformité", async () => {
    const list = await request(app().getHttpServer())
      .get(`/applications/${application.id}/rgaa-compliances`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    const target = list.body[0];

    await request(app().getHttpServer())
      .delete(`/applications/${application.id}/rgaa-compliances/${target.id}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(204);

    const afterDelete = await request(app().getHttpServer())
      .get(`/applications/${application.id}/rgaa-compliances`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    expect(afterDelete.body).toHaveLength(1);
  });
});
