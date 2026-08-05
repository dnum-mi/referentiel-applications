import type { UserFakerReturnType } from "./fakers/user.faker";
import { Roles } from "@prisma/client";
import request from "supertest";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

describe("BusinessDivision", () => {
  const app = setupTestSuite();
  let admin: UserFakerReturnType;
  let contributor: UserFakerReturnType;
  let ADMIN_TOKEN: string;
  let CONTRIBUTOR_TOKEN: string;
  // Libellés dédiés au test (hors divisions seedées), supprimés en fin de suite.
  const LABEL_A = "e2e-direction-alpha";
  const LABEL_B = "e2e-direction-beta";
  const createdIds: string[] = [];

  beforeAll(async () => {
    admin = await UserFaker.create({ role: Roles.ADMIN });
    contributor = await UserFaker.create({ role: Roles.CONTRIBUTOR });
    ADMIN_TOKEN = await getToken(admin);
    CONTRIBUTOR_TOKEN = await getToken(contributor);
  });

  afterAll(async () => {
    for (const id of createdIds) {
      await request(app().getHttpServer())
        .delete(`/business-division/${id}`)
        .set("Authorization", `Bearer ${ADMIN_TOKEN}`);
    }
  });

  it("/POST business-division - should reject a non-admin user", async () => {
    await request(app().getHttpServer())
      .post("/business-division")
      .send({ label: LABEL_A })
      .set("Authorization", `Bearer ${CONTRIBUTOR_TOKEN}`)
      .expect(403);
  });

  it("/POST business-division - should create a division as admin", async () => {
    const response = await request(app().getHttpServer())
      .post("/business-division")
      .send({ label: LABEL_A })
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(201);

    expect(response.body.id).toBeDefined();
    expect(response.body.label).toEqual(LABEL_A);
    createdIds.push(response.body.id);
  });

  it("/POST business-division - should reject a duplicate label", async () => {
    await request(app().getHttpServer())
      .post("/business-division")
      .send({ label: LABEL_A })
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(409);
  });

  it("/POST business-division - should reject an empty label", async () => {
    await request(app().getHttpServer())
      .post("/business-division")
      .send({ label: "" })
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(400);
  });

  it("/GET business-division - should list divisions filtered by label", async () => {
    const list = await request(app().getHttpServer())
      .get("/business-division")
      .query({ label: LABEL_A, pageSize: 100 })
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(200);

    const labels: string[] = list.body.results.map(
      (d: { label: string }) => d.label,
    );
    expect(labels).toContain(LABEL_A);
  });

  it("/PATCH business-division/:id - should update a division as admin", async () => {
    const response = await request(app().getHttpServer())
      .patch(`/business-division/${createdIds[0]}`)
      .send({ label: LABEL_B })
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(200);

    expect(response.body.label).toEqual(LABEL_B);
  });

  it("/PATCH business-division/:id - should allow keeping its own label", async () => {
    await request(app().getHttpServer())
      .patch(`/business-division/${createdIds[0]}`)
      .send({ label: LABEL_B })
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(200);
  });

  it("/PATCH business-division/:id - should reject a non-admin user", async () => {
    await request(app().getHttpServer())
      .patch(`/business-division/${createdIds[0]}`)
      .send({ label: "x" })
      .set("Authorization", `Bearer ${CONTRIBUTOR_TOKEN}`)
      .expect(403);
  });

  it("/DELETE business-division/:id - should reject a non-admin user", async () => {
    await request(app().getHttpServer())
      .delete(`/business-division/${createdIds[0]}`)
      .set("Authorization", `Bearer ${CONTRIBUTOR_TOKEN}`)
      .expect(403);
  });

  it("/DELETE business-division/:id - should delete a division as admin", async () => {
    const id = createdIds.pop()!;
    await request(app().getHttpServer())
      .delete(`/business-division/${id}`)
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(204);
  });
});
