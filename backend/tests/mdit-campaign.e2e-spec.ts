import type { UserFakerReturnType } from "./fakers/user.faker";
import { Roles } from "@prisma/client";
import request from "supertest";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

describe("MditCampaign", () => {
  const app = setupTestSuite();
  let admin: UserFakerReturnType;
  let contributor: UserFakerReturnType;
  let ADMIN_TOKEN: string;
  let CONTRIBUTOR_TOKEN: string;
  // Millésimes dédiés au test (hors campagnes seedées), supprimés en fin de suite.
  const YEAR_A = 2090;
  const YEAR_B = 2091;
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
        .delete(`/mdit-campaigns/${id}`)
        .set("Authorization", `Bearer ${ADMIN_TOKEN}`);
    }
  });

  it("/POST mdit-campaigns - should reject a non-admin user", async () => {
    await request(app().getHttpServer())
      .post("/mdit-campaigns")
      .send({ year: YEAR_A })
      .set("Authorization", `Bearer ${CONTRIBUTOR_TOKEN}`)
      .expect(403);
  });

  it("/POST mdit-campaigns - should create a campaign as admin", async () => {
    const response = await request(app().getHttpServer())
      .post("/mdit-campaigns")
      .send({ year: YEAR_A, label: "Campagne test A" })
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(201);

    expect(response.body.id).toBeDefined();
    expect(response.body.year).toEqual(YEAR_A);
    expect(response.body.label).toEqual("Campagne test A");
    expect(response.body.isActive).toBe(true);
    createdIds.push(response.body.id);
  });

  it("/POST mdit-campaigns - should reject a duplicate millesime", async () => {
    await request(app().getHttpServer())
      .post("/mdit-campaigns")
      .send({ year: YEAR_A })
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(409);
  });

  it("/POST mdit-campaigns - should reject an out-of-range millesime", async () => {
    await request(app().getHttpServer())
      .post("/mdit-campaigns")
      .send({ year: 1999 })
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(400);
  });

  it("/GET mdit-campaigns - should list campaigns sorted by year desc", async () => {
    const response = await request(app().getHttpServer())
      .post("/mdit-campaigns")
      .send({ year: YEAR_B, isActive: false })
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(201);
    createdIds.push(response.body.id);

    const list = await request(app().getHttpServer())
      .get("/mdit-campaigns")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(200);

    const years: number[] = list.body.results.map(
      (c: { year: number }) => c.year,
    );
    expect(years).toContain(YEAR_A);
    expect(years).toContain(YEAR_B);
    expect(years).toEqual([...years].sort((a, b) => b - a));
  });

  it("/GET mdit-campaigns?onlyActive=true - should exclude inactive campaigns", async () => {
    const list = await request(app().getHttpServer())
      .get("/mdit-campaigns")
      .query({ onlyActive: true, pageSize: 100 })
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(200);

    const years: number[] = list.body.results.map(
      (c: { year: number }) => c.year,
    );
    expect(years).toContain(YEAR_A);
    expect(years).not.toContain(YEAR_B); // YEAR_B a été créé inactif
  });

  it("/PATCH mdit-campaigns/:id - should update a campaign as admin", async () => {
    const id = createdIds[0];
    const response = await request(app().getHttpServer())
      .patch(`/mdit-campaigns/${id}`)
      .send({ label: "Campagne test A modifiée", isActive: false })
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(200);

    expect(response.body.label).toEqual("Campagne test A modifiée");
    expect(response.body.isActive).toBe(false);
  });

  it("/PATCH mdit-campaigns/:id - should reject a non-admin user", async () => {
    await request(app().getHttpServer())
      .patch(`/mdit-campaigns/${createdIds[0]}`)
      .send({ label: "x" })
      .set("Authorization", `Bearer ${CONTRIBUTOR_TOKEN}`)
      .expect(403);
  });

  it("/DELETE mdit-campaigns/:id - should delete a campaign as admin", async () => {
    const id = createdIds.pop()!;
    await request(app().getHttpServer())
      .delete(`/mdit-campaigns/${id}`)
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(204);
  });
});
