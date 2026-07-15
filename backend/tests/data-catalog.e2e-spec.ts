import type { UserFakerReturnType } from "./fakers/user.faker";
import { Permission, Roles } from "@prisma/client";
import request from "supertest";
import { ApplicationFaker } from "./fakers/application.faker";
import { DataApplicationFaker } from "./fakers/data-application.faker";
import { DataDescriptionFaker } from "./fakers/data-description.faker";
import { DataExposureFaker } from "./fakers/data-exposure.faker";
import { DataFamilyFaker } from "./fakers/data-family.faker";
import { DataSensibilityFaker } from "./fakers/data-sensibility.faker";
import { TagFaker } from "./fakers/tag.faker";
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

    it("filters by name", async () => {
      await DataDescriptionFaker.create({ name: "Adresse postale unique e2e" });

      const response = await request(app().getHttpServer())
        .get("/data-catalog/descriptions")
        .query({ name: "postale unique e2e" })
        .set("Authorization", `Bearer ${READER_TOKEN}`)
        .expect(200);

      expect(response.body.length).toBeGreaterThan(0);
      expect(
        response.body.every((description: { name: string }) =>
          description.name.toLowerCase().includes("postale unique e2e"),
        ),
      ).toBe(true);
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

  describe("GET /data-catalog/applications/:applicationId (sorting)", () => {
    it("sorts by family path (sortBy=family)", async () => {
      const sortApplication = await ApplicationFaker.create(writerUser);
      const familyA = await DataFamilyFaker.create({ path: "AAA sort family" });
      const familyZ = await DataFamilyFaker.create({ path: "ZZZ sort family" });
      const descA = await DataDescriptionFaker.create({ familyId: familyA.id });
      const descZ = await DataDescriptionFaker.create({ familyId: familyZ.id });

      await request(app().getHttpServer())
        .post(`/data-catalog/applications/${sortApplication.id}`)
        .set("Authorization", `Bearer ${WRITER_TOKEN}`)
        .send({ dataDescriptionId: descZ.id })
        .expect(201);
      await request(app().getHttpServer())
        .post(`/data-catalog/applications/${sortApplication.id}`)
        .set("Authorization", `Bearer ${WRITER_TOKEN}`)
        .send({ dataDescriptionId: descA.id })
        .expect(201);

      const response = await request(app().getHttpServer())
        .get(`/data-catalog/applications/${sortApplication.id}`)
        .query({ sortBy: "family", order: "asc" })
        .set("Authorization", `Bearer ${READER_TOKEN}`)
        .expect(200);

      expect(
        response.body.results.map((r: any) => r.dataDescription.family.path),
      ).toEqual(["AAA sort family", "ZZZ sort family"]);
    });

    it("sorts by sensibility label (sortBy=sensibility)", async () => {
      const sortApplication = await ApplicationFaker.create(writerUser);

      const sensibilityA = await request(app().getHttpServer())
        .post("/data-catalog/sensibilities")
        .set("Authorization", `Bearer ${WRITER_TOKEN}`)
        .send({ label: "AAA sort sensibility", color: "#111111" })
        .expect(201);
      const sensibilityZ = await request(app().getHttpServer())
        .post("/data-catalog/sensibilities")
        .set("Authorization", `Bearer ${WRITER_TOKEN}`)
        .send({ label: "ZZZ sort sensibility", color: "#222222" })
        .expect(201);

      const descA = await DataDescriptionFaker.create();
      const descZ = await DataDescriptionFaker.create();

      await request(app().getHttpServer())
        .post(`/data-catalog/applications/${sortApplication.id}`)
        .set("Authorization", `Bearer ${WRITER_TOKEN}`)
        .send({
          dataDescriptionId: descZ.id,
          sensibilityId: sensibilityZ.body.id,
        })
        .expect(201);
      await request(app().getHttpServer())
        .post(`/data-catalog/applications/${sortApplication.id}`)
        .set("Authorization", `Bearer ${WRITER_TOKEN}`)
        .send({
          dataDescriptionId: descA.id,
          sensibilityId: sensibilityA.body.id,
        })
        .expect(201);

      const response = await request(app().getHttpServer())
        .get(`/data-catalog/applications/${sortApplication.id}`)
        .query({ sortBy: "sensibility", order: "asc" })
        .set("Authorization", `Bearer ${READER_TOKEN}`)
        .expect(200);

      expect(
        response.body.results.map((r: any) => r.sensibility.label),
      ).toEqual(["AAA sort sensibility", "ZZZ sort sensibility"]);
    });

    it("sorts by isReference (sortBy=isReference)", async () => {
      const sortApplication = await ApplicationFaker.create(writerUser);
      const descTrue = await DataDescriptionFaker.create();
      const descFalse = await DataDescriptionFaker.create();

      await request(app().getHttpServer())
        .post(`/data-catalog/applications/${sortApplication.id}`)
        .set("Authorization", `Bearer ${WRITER_TOKEN}`)
        .send({ dataDescriptionId: descTrue.id, isReference: true })
        .expect(201);
      await request(app().getHttpServer())
        .post(`/data-catalog/applications/${sortApplication.id}`)
        .set("Authorization", `Bearer ${WRITER_TOKEN}`)
        .send({ dataDescriptionId: descFalse.id, isReference: false })
        .expect(201);

      const response = await request(app().getHttpServer())
        .get(`/data-catalog/applications/${sortApplication.id}`)
        .query({ sortBy: "isReference", order: "asc" })
        .set("Authorization", `Bearer ${READER_TOKEN}`)
        .expect(200);

      expect(response.body.results.map((r: any) => r.isReference)).toEqual([
        false,
        true,
      ]);
    });

    it("sorts by tag count (sortBy=tags)", async () => {
      const sortApplication = await ApplicationFaker.create(writerUser);
      const tagOne = await TagFaker.create();
      const tagTwo = await TagFaker.create();
      const descNoTags = await DataDescriptionFaker.create({ tagIds: [] });
      const descTwoTags = await DataDescriptionFaker.create({
        tagIds: [tagOne.id, tagTwo.id],
      });

      await request(app().getHttpServer())
        .post(`/data-catalog/applications/${sortApplication.id}`)
        .set("Authorization", `Bearer ${WRITER_TOKEN}`)
        .send({ dataDescriptionId: descTwoTags.id })
        .expect(201);
      await request(app().getHttpServer())
        .post(`/data-catalog/applications/${sortApplication.id}`)
        .set("Authorization", `Bearer ${WRITER_TOKEN}`)
        .send({ dataDescriptionId: descNoTags.id })
        .expect(201);

      const response = await request(app().getHttpServer())
        .get(`/data-catalog/applications/${sortApplication.id}`)
        .query({ sortBy: "tags", order: "asc" })
        .set("Authorization", `Bearer ${READER_TOKEN}`)
        .expect(200);

      expect(
        response.body.results.map((r: any) => r.dataDescription.id),
      ).toEqual([descNoTags.id, descTwoTags.id]);
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

  describe("POST /data-catalog/applications/:applicationId", () => {
    it("returns 403 without DataWrite permission", async () => {
      const description = await DataDescriptionFaker.create();

      await request(app().getHttpServer())
        .post(`/data-catalog/applications/${application.id}`)
        .set("Authorization", `Bearer ${READER_TOKEN}`)
        .send({ dataDescriptionId: description.id })
        .expect(403);
    });

    it("attaches a data description to an application and returns 201", async () => {
      const description = await DataDescriptionFaker.create();

      const response = await request(app().getHttpServer())
        .post(`/data-catalog/applications/${application.id}`)
        .set("Authorization", `Bearer ${WRITER_TOKEN}`)
        .send({ dataDescriptionId: description.id, isReference: true })
        .expect(201);

      expect(response.body).toMatchObject({
        applicationId: application.id,
        dataDescriptionId: description.id,
        isReference: true,
      });
    });
  });

  describe("PATCH /data-catalog/applications/:applicationId/:dataApplicationId", () => {
    it("returns 403 without DataWrite permission", async () => {
      const description = await DataDescriptionFaker.create();
      const dataApp = await DataApplicationFaker.create({
        applicationId: application.id,
        dataDescriptionId: description.id,
      });

      await request(app().getHttpServer())
        .patch(`/data-catalog/applications/${application.id}/${dataApp.id}`)
        .set("Authorization", `Bearer ${READER_TOKEN}`)
        .send({ businessUsage: "Updated" })
        .expect(403);
    });

    it("updates a data application and returns 200", async () => {
      const description = await DataDescriptionFaker.create();
      const dataApp = await DataApplicationFaker.create({
        applicationId: application.id,
        dataDescriptionId: description.id,
      });

      const response = await request(app().getHttpServer())
        .patch(`/data-catalog/applications/${application.id}/${dataApp.id}`)
        .set("Authorization", `Bearer ${WRITER_TOKEN}`)
        .send({ businessUsage: "Nouvel usage métier" })
        .expect(200);

      expect(response.body).toMatchObject({
        businessUsage: "Nouvel usage métier",
      });
    });

    it("returns 404 for non-existent data application", async () => {
      const nonExistentId = "00000000-0000-0000-0000-000000000000";

      await request(app().getHttpServer())
        .patch(`/data-catalog/applications/${application.id}/${nonExistentId}`)
        .set("Authorization", `Bearer ${WRITER_TOKEN}`)
        .send({ businessUsage: "Nouvel usage métier" })
        .expect(404);
    });
  });

  describe("DELETE /data-catalog/applications/:applicationId/:dataApplicationId", () => {
    it("returns 403 without DataWrite permission", async () => {
      const description = await DataDescriptionFaker.create();
      const dataApp = await DataApplicationFaker.create({
        applicationId: application.id,
        dataDescriptionId: description.id,
      });

      await request(app().getHttpServer())
        .delete(`/data-catalog/applications/${application.id}/${dataApp.id}`)
        .set("Authorization", `Bearer ${READER_TOKEN}`)
        .expect(403);
    });

    it("deletes a data application and returns 204", async () => {
      const description = await DataDescriptionFaker.create();
      const dataApp = await DataApplicationFaker.create({
        applicationId: application.id,
        dataDescriptionId: description.id,
      });

      await request(app().getHttpServer())
        .delete(`/data-catalog/applications/${application.id}/${dataApp.id}`)
        .set("Authorization", `Bearer ${WRITER_TOKEN}`)
        .expect(204);
    });

    it("returns 404 for non-existent data application", async () => {
      const nonExistentId = "00000000-0000-0000-0000-000000000000";

      await request(app().getHttpServer())
        .delete(`/data-catalog/applications/${application.id}/${nonExistentId}`)
        .set("Authorization", `Bearer ${WRITER_TOKEN}`)
        .expect(404);
    });
  });

  // =====================================================
  // DATA EXPOSURES
  // =====================================================

  describe("POST /data-catalog/applications/:applicationId/:dataApplicationId/exposures", () => {
    it("returns 403 without DataWrite permission", async () => {
      const description = await DataDescriptionFaker.create();
      const dataApp = await DataApplicationFaker.create({
        applicationId: application.id,
        dataDescriptionId: description.id,
      });

      await request(app().getHttpServer())
        .post(
          `/data-catalog/applications/${application.id}/${dataApp.id}/exposures`,
        )
        .set("Authorization", `Bearer ${READER_TOKEN}`)
        .send({ type: "API REST" })
        .expect(403);
    });

    it("creates an exposure and returns 201", async () => {
      const description = await DataDescriptionFaker.create();
      const dataApp = await DataApplicationFaker.create({
        applicationId: application.id,
        dataDescriptionId: description.id,
      });

      const response = await request(app().getHttpServer())
        .post(
          `/data-catalog/applications/${application.id}/${dataApp.id}/exposures`,
        )
        .set("Authorization", `Bearer ${WRITER_TOKEN}`)
        .send({ type: "API REST", endpoint: "/api/v1/test" })
        .expect(201);

      expect(response.body).toMatchObject({
        type: "API REST",
        endpoint: "/api/v1/test",
      });
    });

    it("returns 404 when data application does not belong to the application", async () => {
      const nonExistentId = "00000000-0000-0000-0000-000000000000";

      await request(app().getHttpServer())
        .post(
          `/data-catalog/applications/${application.id}/${nonExistentId}/exposures`,
        )
        .set("Authorization", `Bearer ${WRITER_TOKEN}`)
        .send({ type: "API REST" })
        .expect(404);
    });
  });

  describe("PATCH /data-catalog/applications/:applicationId/:dataApplicationId/exposures/:exposureId", () => {
    it("updates an exposure and returns 200", async () => {
      const description = await DataDescriptionFaker.create();
      const dataApp = await DataApplicationFaker.create({
        applicationId: application.id,
        dataDescriptionId: description.id,
      });
      const exposure = await DataExposureFaker.create({
        dataApplicationId: dataApp.id,
      });

      const response = await request(app().getHttpServer())
        .patch(
          `/data-catalog/applications/${application.id}/${dataApp.id}/exposures/${exposure.id}`,
        )
        .set("Authorization", `Bearer ${WRITER_TOKEN}`)
        .send({ format: "XML" })
        .expect(200);

      expect(response.body).toMatchObject({ format: "XML" });
    });

    it("returns 404 for non-existent exposure", async () => {
      const description = await DataDescriptionFaker.create();
      const dataApp = await DataApplicationFaker.create({
        applicationId: application.id,
        dataDescriptionId: description.id,
      });
      const nonExistentId = "00000000-0000-0000-0000-000000000000";

      await request(app().getHttpServer())
        .patch(
          `/data-catalog/applications/${application.id}/${dataApp.id}/exposures/${nonExistentId}`,
        )
        .set("Authorization", `Bearer ${WRITER_TOKEN}`)
        .send({ format: "XML" })
        .expect(404);
    });
  });

  describe("DELETE /data-catalog/applications/:applicationId/:dataApplicationId/exposures/:exposureId", () => {
    it("deletes an exposure and returns 204", async () => {
      const description = await DataDescriptionFaker.create();
      const dataApp = await DataApplicationFaker.create({
        applicationId: application.id,
        dataDescriptionId: description.id,
      });
      const exposure = await DataExposureFaker.create({
        dataApplicationId: dataApp.id,
      });

      await request(app().getHttpServer())
        .delete(
          `/data-catalog/applications/${application.id}/${dataApp.id}/exposures/${exposure.id}`,
        )
        .set("Authorization", `Bearer ${WRITER_TOKEN}`)
        .expect(204);
    });

    it("returns 404 for non-existent exposure", async () => {
      const description = await DataDescriptionFaker.create();
      const dataApp = await DataApplicationFaker.create({
        applicationId: application.id,
        dataDescriptionId: description.id,
      });
      const nonExistentId = "00000000-0000-0000-0000-000000000000";

      await request(app().getHttpServer())
        .delete(
          `/data-catalog/applications/${application.id}/${dataApp.id}/exposures/${nonExistentId}`,
        )
        .set("Authorization", `Bearer ${WRITER_TOKEN}`)
        .expect(404);
    });
  });
});
