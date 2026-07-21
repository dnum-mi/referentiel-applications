import type { UserFakerReturnType } from "./fakers/user.faker";
import { Permission, Roles } from "@prisma/client";
import request from "supertest";
import { DataFamilyFaker } from "./fakers/data-family.faker";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

describe("DataFamily", () => {
  const app = setupTestSuite();
  let readerUser: UserFakerReturnType;
  let writerUser: UserFakerReturnType;
  let contributorUser: UserFakerReturnType;
  let READER_TOKEN: string;
  let WRITER_TOKEN: string;
  let CONTRIBUTOR_TOKEN: string;

  beforeAll(async () => {
    readerUser = await UserFaker.create({ role: Roles.READER });
    writerUser = await UserFaker.create({
      role: Roles.READER,
      additionalPermissions: [Permission.DataWrite],
    });
    contributorUser = await UserFaker.create({ role: Roles.CONTRIBUTOR });

    READER_TOKEN = await getToken(readerUser);
    WRITER_TOKEN = await getToken(writerUser);
    CONTRIBUTOR_TOKEN = await getToken(contributorUser);
  });

  describe("POST /data-catalog/families", () => {
    it("returns 403 without DataWrite permission", async () => {
      await request(app().getHttpServer())
        .post("/data-catalog/families")
        .set("Authorization", `Bearer ${READER_TOKEN}`)
        .send({ path: "Identité / Etat civil" })
        .expect(403);
    });

    it("creates a family and returns 201", async () => {
      const response = await request(app().getHttpServer())
        .post("/data-catalog/families")
        .set("Authorization", `Bearer ${WRITER_TOKEN}`)
        .send({ path: "Identité / Etat civil" })
        .expect(201);

      expect(response.body).toMatchObject({ path: "Identité / Etat civil" });
      expect(response.body.id).toBeDefined();
    });

    it("allows a CONTRIBUTOR role user without any explicit additional permission", async () => {
      await request(app().getHttpServer())
        .post("/data-catalog/families")
        .set("Authorization", `Bearer ${CONTRIBUTOR_TOKEN}`)
        .send({ path: "Gestion RH / Formation" })
        .expect(201);
    });
  });

  describe("GET /data-catalog/families", () => {
    it("returns 200 with a paginated list of families", async () => {
      await DataFamilyFaker.create();

      const response = await request(app().getHttpServer())
        .get("/data-catalog/families")
        .set("Authorization", `Bearer ${READER_TOKEN}`)
        .expect(200);

      expect(response.body).toHaveProperty("results");
      expect(Array.isArray(response.body.results)).toBe(true);
    });
  });

  describe("PATCH /data-catalog/families/:id", () => {
    it("returns 403 without DataWrite permission", async () => {
      const family = await DataFamilyFaker.create();

      await request(app().getHttpServer())
        .patch(`/data-catalog/families/${family.id}`)
        .set("Authorization", `Bearer ${READER_TOKEN}`)
        .send({ path: "Updated path" })
        .expect(403);
    });

    it("updates a family and returns 200", async () => {
      const family = await DataFamilyFaker.create();

      const response = await request(app().getHttpServer())
        .patch(`/data-catalog/families/${family.id}`)
        .set("Authorization", `Bearer ${WRITER_TOKEN}`)
        .send({ path: "Updated path" })
        .expect(200);

      expect(response.body).toMatchObject({ path: "Updated path" });
    });
  });

  describe("DELETE /data-catalog/families/:id", () => {
    it("returns 403 without DataWrite permission", async () => {
      const family = await DataFamilyFaker.create();

      await request(app().getHttpServer())
        .delete(`/data-catalog/families/${family.id}`)
        .set("Authorization", `Bearer ${READER_TOKEN}`)
        .expect(403);
    });

    it("deletes a family and returns 204", async () => {
      const family = await DataFamilyFaker.create();

      await request(app().getHttpServer())
        .delete(`/data-catalog/families/${family.id}`)
        .set("Authorization", `Bearer ${WRITER_TOKEN}`)
        .expect(204);
    });
  });
});
