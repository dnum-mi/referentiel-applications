import type { UserFakerReturnType } from "./fakers/user.faker";
import { Permission, Roles } from "@prisma/client";
import request from "supertest";
import { ApplicationFaker } from "./fakers/application.faker";
import { DataApplicationFaker } from "./fakers/data-application.faker";
import { DataDescriptionFaker } from "./fakers/data-description.faker";
import { DataFamilyFaker } from "./fakers/data-family.faker";
import { DataSensibilityFaker } from "./fakers/data-sensibility.faker";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

describe("DataCatalog", () => {
  const app = setupTestSuite();
  let readerUser: UserFakerReturnType;
  let writerUser: UserFakerReturnType;
  let READER_TOKEN: string;
  let WRITER_TOKEN: string;
  let application: { id: string };

  beforeAll(async () => {
    readerUser = await UserFaker.create({ role: Roles.READER });
    writerUser = await UserFaker.create({
      role: Roles.READER,
      additionalPermissions: [Permission.AppWrite, Permission.DataWrite],
    });

    READER_TOKEN = await getToken(readerUser);
    WRITER_TOKEN = await getToken(writerUser);

    application = await ApplicationFaker.create(writerUser);
  });

  // =====================================================
  // DATA DESCRIPTIONS
  // =====================================================

  describe("POST /data-catalog/descriptions", () => {
    it("returns 403 without AppWrite permission", async () => {
      await request(app().getHttpServer())
        .post("/data-catalog/descriptions")
        .set("Authorization", `Bearer ${READER_TOKEN}`)
        .send({ name: "Test description" })
        .expect(403);
    });

    it("creates a description and returns 201", async () => {
      const response = await request(app().getHttpServer())
        .post("/data-catalog/descriptions")
        .set("Authorization", `Bearer ${WRITER_TOKEN}`)
        .send({ name: "Identité civile" })
        .expect(201);

      expect(response.body).toMatchObject({ name: "Identité civile" });
      expect(response.body.id).toBeDefined();
    });

    it("creates a description with all optional fields", async () => {
      const family = await DataFamilyFaker.create();

      const response = await request(app().getHttpServer())
        .post("/data-catalog/descriptions")
        .set("Authorization", `Bearer ${WRITER_TOKEN}`)
        .send({
          name: "Données de paie",
          description: "Données relatives aux paies mensuelles.",
          familyId: family.id,
          officialUrl: "https://www.data.gouv.fr/fr/datasets/base-sirene",
        })
        .expect(201);

      expect(response.body).toMatchObject({
        name: "Données de paie",
        description: "Données relatives aux paies mensuelles.",
        family: { id: family.id },
      });
    });
  });

  describe("GET /data-catalog/descriptions", () => {
    it("returns 200 with list of descriptions", async () => {
      await DataDescriptionFaker.create();

      const response = await request(app().getHttpServer())
        .get("/data-catalog/descriptions")
        .set("Authorization", `Bearer ${READER_TOKEN}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it("supports pagination query params", async () => {
      await request(app().getHttpServer())
        .get("/data-catalog/descriptions")
        .query({ page: 0, pageSize: 5 })
        .set("Authorization", `Bearer ${READER_TOKEN}`)
        .expect(200);
    });
  });

  describe("PATCH /data-catalog/descriptions/:id", () => {
    it("returns 403 without AppWrite permission", async () => {
      const description = await DataDescriptionFaker.create();

      await request(app().getHttpServer())
        .patch(`/data-catalog/descriptions/${description.id}`)
        .set("Authorization", `Bearer ${READER_TOKEN}`)
        .send({ name: "Updated name" })
        .expect(403);
    });

    it("updates a description and returns 200", async () => {
      const description = await DataDescriptionFaker.create();

      const response = await request(app().getHttpServer())
        .patch(`/data-catalog/descriptions/${description.id}`)
        .set("Authorization", `Bearer ${WRITER_TOKEN}`)
        .send({ name: "Updated data name" })
        .expect(200);

      expect(response.body).toMatchObject({ name: "Updated data name" });
    });
  });

  describe("DELETE /data-catalog/descriptions/:id", () => {
    it("returns 403 without AppWrite permission", async () => {
      const description = await DataDescriptionFaker.create();

      await request(app().getHttpServer())
        .delete(`/data-catalog/descriptions/${description.id}`)
        .set("Authorization", `Bearer ${READER_TOKEN}`)
        .expect(403);
    });

    it("deletes a description and returns 204", async () => {
      const description = await DataDescriptionFaker.create();

      await request(app().getHttpServer())
        .delete(`/data-catalog/descriptions/${description.id}`)
        .set("Authorization", `Bearer ${WRITER_TOKEN}`)
        .expect(204);
    });
  });

  // =====================================================
  // APPLICATION DATA
  // =====================================================

  describe("GET /data-catalog/applications/:applicationId", () => {
    it("returns 200 with empty list when no data linked", async () => {
      const response = await request(app().getHttpServer())
        .get(`/data-catalog/applications/${application.id}`)
        .set("Authorization", `Bearer ${READER_TOKEN}`)
        .expect(200);

      expect(response.body).toHaveProperty("results");
      expect(Array.isArray(response.body.results)).toBe(true);
    });

    it("returns linked data applications with pagination", async () => {
      const sensibilities = await DataSensibilityFaker.createAll();
      const description = await DataDescriptionFaker.create();

      await DataApplicationFaker.create({
        applicationId: application.id,
        dataDescriptionId: description.id,
        sensibilityId: sensibilities[0].id,
      });

      const response = await request(app().getHttpServer())
        .get(`/data-catalog/applications/${application.id}`)
        .query({ page: 0, pageSize: 10 })
        .set("Authorization", `Bearer ${READER_TOKEN}`)
        .expect(200);

      expect(response.body.results.length).toBeGreaterThan(0);
    });
  });

  describe("GET /data-catalog/applications/:applicationId/:dataApplicationId", () => {
    it("returns 200 with data application detail", async () => {
      const description = await DataDescriptionFaker.create();
      const dataApp = await DataApplicationFaker.create({
        applicationId: application.id,
        dataDescriptionId: description.id,
      });

      const response = await request(app().getHttpServer())
        .get(`/data-catalog/applications/${application.id}/${dataApp.id}`)
        .set("Authorization", `Bearer ${READER_TOKEN}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: dataApp.id,
        applicationId: application.id,
        dataDescriptionId: description.id,
      });
    });

    it("returns 404 for non-existent data application", async () => {
      const nonExistentId = "00000000-0000-0000-0000-000000000000";

      await request(app().getHttpServer())
        .get(`/data-catalog/applications/${application.id}/${nonExistentId}`)
        .set("Authorization", `Bearer ${READER_TOKEN}`)
        .expect(404);
    });
  });
});
