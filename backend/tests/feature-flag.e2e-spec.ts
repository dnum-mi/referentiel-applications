import type { UserFakerReturnType } from "./fakers/user.faker";
import { Roles } from "@prisma/client";
import request from "supertest";
import { getPrismaClient } from "./fakers/prisma";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";
import { UserFaker } from "./fakers/user.faker";

const TEST_FLAG_KEY = "fulltext-search";

describe("FeatureFlags", () => {
  const app = setupTestSuite();
  const prisma = getPrismaClient();

  let admin: UserFakerReturnType;
  let reader: UserFakerReturnType;
  let ADMIN_TOKEN: string;
  let READER_TOKEN: string;

  beforeAll(async () => {
    admin = await UserFaker.create({ role: Roles.ADMIN });
    reader = await UserFaker.create({ role: Roles.READER });
    ADMIN_TOKEN = getToken(admin);
    READER_TOKEN = getToken(reader);

    // Garantit l'existence du flag de test, désactivé au départ.
    await prisma.featureFlag.upsert({
      where: { key: TEST_FLAG_KEY },
      update: { enabled: false },
      create: {
        key: TEST_FLAG_KEY,
        label: "Recherche full-text",
        description: "Flag de test",
        enabled: false,
      },
    });
  });

  it("/GET feature-flags refuses unauthenticated requests", async () => {
    await request(app().getHttpServer()).get("/feature-flags").expect(401);
  });

  it("/GET feature-flags forbids non-admin users", async () => {
    await request(app().getHttpServer())
      .get("/feature-flags")
      .set("Authorization", `Bearer ${READER_TOKEN}`)
      .expect(403);
  });

  it("/GET feature-flags returns the catalog for an admin", async () => {
    const response = await request(app().getHttpServer())
      .get("/feature-flags")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    const flag = response.body.find(
      (f: { key: string }) => f.key === TEST_FLAG_KEY,
    );
    expect(flag).toMatchObject({
      key: TEST_FLAG_KEY,
      label: expect.any(String),
      enabled: false,
    });
  });

  it("/PATCH feature-flags/:key toggles a flag and reflects it in /config", async () => {
    await request(app().getHttpServer())
      .patch(`/feature-flags/${TEST_FLAG_KEY}`)
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ enabled: true })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ key: TEST_FLAG_KEY, enabled: true });
      });

    // La bascule est reflétée sans redémarrage (cache invalidé au PATCH).
    const config = await request(app().getHttpServer())
      .get("/config")
      .expect(200);
    expect(config.body.featureFlags[TEST_FLAG_KEY]).toBe(true);
  });

  it("/PATCH feature-flags/:key returns 404 for an unknown flag", async () => {
    await request(app().getHttpServer())
      .patch("/feature-flags/does-not-exist")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ enabled: true })
      .expect(404);
  });

  it("/PATCH feature-flags/:key forbids non-admin users", async () => {
    await request(app().getHttpServer())
      .patch(`/feature-flags/${TEST_FLAG_KEY}`)
      .set("Authorization", `Bearer ${READER_TOKEN}`)
      .send({ enabled: false })
      .expect(403);
  });
});
