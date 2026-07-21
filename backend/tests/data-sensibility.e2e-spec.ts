import type { UserFakerReturnType } from "./fakers/user.faker";
import { Permission, Roles } from "@prisma/client";
import request from "supertest";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

describe("DataSensibility", () => {
  const app = setupTestSuite();
  let readerUser: UserFakerReturnType;
  let writerUser: UserFakerReturnType;
  let READER_TOKEN: string;
  let WRITER_TOKEN: string;

  beforeAll(async () => {
    readerUser = await UserFaker.create({ role: Roles.READER });
    writerUser = await UserFaker.create({
      role: Roles.READER,
      additionalPermissions: [Permission.DataWrite],
    });

    READER_TOKEN = await getToken(readerUser);
    WRITER_TOKEN = await getToken(writerUser);
  });

  describe("POST /data-catalog/sensibilities", () => {
    it("returns 403 without DataWrite permission", async () => {
      await request(app().getHttpServer())
        .post("/data-catalog/sensibilities")
        .set("Authorization", `Bearer ${READER_TOKEN}`)
        .send({ label: "Sensible", color: "#ce0500" })
        .expect(403);
    });

    it("creates a sensibility level and returns 201", async () => {
      const response = await request(app().getHttpServer())
        .post("/data-catalog/sensibilities")
        .set("Authorization", `Bearer ${WRITER_TOKEN}`)
        .send({ label: "Sensible", color: "#ce0500" })
        .expect(201);

      expect(response.body).toMatchObject({
        label: "Sensible",
        color: "#ce0500",
      });
      expect(response.body.id).toBeDefined();
    });
  });

  describe("GET /data-catalog/sensibilities", () => {
    it("returns 200 with a paginated list of sensibility levels", async () => {
      const response = await request(app().getHttpServer())
        .get("/data-catalog/sensibilities")
        .set("Authorization", `Bearer ${READER_TOKEN}`)
        .expect(200);

      expect(response.body).toHaveProperty("results");
      expect(Array.isArray(response.body.results)).toBe(true);
    });
  });

  describe("PATCH /data-catalog/sensibilities/:id", () => {
    it("updates a sensibility level and returns 200", async () => {
      const created = await request(app().getHttpServer())
        .post("/data-catalog/sensibilities")
        .set("Authorization", `Bearer ${WRITER_TOKEN}`)
        .send({ label: "Rgpd", color: "#0063CB" })
        .expect(201);

      const response = await request(app().getHttpServer())
        .patch(`/data-catalog/sensibilities/${created.body.id}`)
        .set("Authorization", `Bearer ${WRITER_TOKEN}`)
        .send({ color: "#000000" })
        .expect(200);

      expect(response.body).toMatchObject({ color: "#000000" });
    });
  });

  describe("DELETE /data-catalog/sensibilities/:id", () => {
    it("deletes a sensibility level and returns 204", async () => {
      const created = await request(app().getHttpServer())
        .post("/data-catalog/sensibilities")
        .set("Authorization", `Bearer ${WRITER_TOKEN}`)
        .send({ label: "Interne", color: "#666666" })
        .expect(201);

      await request(app().getHttpServer())
        .delete(`/data-catalog/sensibilities/${created.body.id}`)
        .set("Authorization", `Bearer ${WRITER_TOKEN}`)
        .expect(204);
    });
  });
});
