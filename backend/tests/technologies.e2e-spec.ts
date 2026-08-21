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

  it("POST - ajoute une entrée (technologie + produit + version + docUrl)", async () => {
    const response = await request(app().getHttpServer())
      .post(`/applications/${application.id}/technologies`)
      .send({
        technology: "Base de données",
        product: "PostgreSQL",
        version: "16.0",
        docUrl: "https://www.postgresql.org/docs/",
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(201);

    expect(response.body.id).toBeDefined();
    expect(response.body.applicationId).toEqual(application.id);
    expect(response.body.technology).toEqual("Base de données");
    expect(response.body.product).toEqual("PostgreSQL");
    expect(response.body.version).toEqual("16.0");
    expect(response.body.docUrl).toEqual("https://www.postgresql.org/docs/");
  });

  it("POST - accepte une même technologie avec un produit différent", async () => {
    const response = await request(app().getHttpServer())
      .post(`/applications/${application.id}/technologies`)
      .send({ technology: "Base de données", product: "MySQL" })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(201);

    expect(response.body.product).toEqual("MySQL");
  });

  it("GET - retourne les deux entrées", async () => {
    const response = await request(app().getHttpServer())
      .get(`/applications/${application.id}/technologies`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    expect(response.body).toHaveLength(2);
  });

  it("POST - met à jour la ligne existante au lieu de créer un doublon (même technologie + produit)", async () => {
    const response = await request(app().getHttpServer())
      .post(`/applications/${application.id}/technologies`)
      .send({
        technology: "Base de données",
        product: "PostgreSQL",
        version: "15.0",
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(201);

    expect(response.body.product).toEqual("PostgreSQL");
    expect(response.body.version).toEqual("15.0");

    const list = await request(app().getHttpServer())
      .get(`/applications/${application.id}/technologies`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    expect(list.body).toHaveLength(2);
  });

  it("POST - rapproche le couple technologie/produit sans tenir compte de la casse", async () => {
    const response = await request(app().getHttpServer())
      .post(`/applications/${application.id}/technologies`)
      .send({
        technology: "base de données",
        product: "postgresql",
        version: "15.6",
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(201);

    // La graphie déjà enregistrée est conservée, la version est mise à jour.
    expect(response.body.product).toEqual("PostgreSQL");
    expect(response.body.technology).toEqual("Base de données");
    expect(response.body.version).toEqual("15.6");

    const list = await request(app().getHttpServer())
      .get(`/applications/${application.id}/technologies`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    expect(list.body).toHaveLength(2);
  });

  it("POST - rejette une entrée sans produit (produit requis) avec un 400", async () => {
    await request(app().getHttpServer())
      .post(`/applications/${application.id}/technologies`)
      .send({ technology: "Langage" })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(400);
  });

  it("PATCH - met à jour une entrée (version)", async () => {
    const list = await request(app().getHttpServer())
      .get(`/applications/${application.id}/technologies`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    const target = list.body.find(
      (t: { product: string }) => t.product === "PostgreSQL",
    );

    const response = await request(app().getHttpServer())
      .patch(`/applications/${application.id}/technologies/${target.id}`)
      .send({
        technology: "Base de données",
        product: "PostgreSQL",
        version: "17.0",
      })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    expect(response.body.version).toEqual("17.0");
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
