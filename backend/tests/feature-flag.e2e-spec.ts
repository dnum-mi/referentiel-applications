import type { UserFakerReturnType } from "./fakers/user.faker";
import { Roles } from "@prisma/client";
import request from "supertest";
import { FeatureFlagKey } from "../src/feature-flag/feature-flag.keys";
import { ApplicationFaker } from "./fakers/application.faker";
import { OrganizationFaker } from "./fakers/organization.faker";
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

  it("/GET feature-flags matches the shared key catalog exactly (anti-drift)", async () => {
    const response = await request(app().getHttpServer())
      .get("/feature-flags")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(200);

    // Le pivot de tout le système : la base (peuplée par la sync au boot),
    // l'enum backend et — par miroir contrôlé côté front — les constantes du
    // front doivent référencer exactement les mêmes clés.
    const exposedKeys = (response.body as { key: string }[])
      .map((f) => f.key)
      .sort();
    expect(exposedKeys).toEqual([...Object.values(FeatureFlagKey)].sort());
  });

  it("does not expose the audit field updatedById (DTO contract)", async () => {
    const response = await request(app().getHttpServer())
      .get("/feature-flags")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(200);

    for (const flag of response.body as Record<string, unknown>[]) {
      expect(flag).not.toHaveProperty("updatedById");
    }
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

  // Le feature flipping a un effet global : un administrateur restreint à un
  // périmètre (scopeOrganizationId) est refusé, même avec AdminPanelManage.
  describe("global admin only (scoped admin locked out)", () => {
    let SCOPED_ADMIN_TOKEN: string;

    beforeAll(async () => {
      const org = await OrganizationFaker.create();
      const scopedAdmin = await UserFaker.create({ role: Roles.ADMIN });
      await prisma.user.update({
        where: { id: scopedAdmin.id },
        data: { scopeOrganizationId: org.id },
      });
      SCOPED_ADMIN_TOKEN = getToken(scopedAdmin);
    });

    it("forbids a scoped admin from listing the flags", async () => {
      await request(app().getHttpServer())
        .get("/feature-flags")
        .set("Authorization", `Bearer ${SCOPED_ADMIN_TOKEN}`)
        .expect(403);
    });

    it("forbids a scoped admin from toggling a flag", async () => {
      await request(app().getHttpServer())
        .patch(`/feature-flags/${TEST_FLAG_KEY}`)
        .set("Authorization", `Bearer ${SCOPED_ADMIN_TOKEN}`)
        .send({ enabled: true })
        .expect(403);
    });
  });

  // Gating de bout en bout, paramétré sur chaque domaine gardé : le PATCH
  // invalide le cache, donc la bascule prend effet immédiatement sur la route
  // gatée (404 quand off, 200 quand on). Pour `technology-stack`, la route est
  // imbriquée sous une application réelle — un id bidon renverrait 404 même
  // flag on (mauvais oracle), on sème donc une application.
  describe("guarded endpoints", () => {
    let gatedApp: Awaited<ReturnType<typeof ApplicationFaker.create>>;

    beforeAll(async () => {
      gatedApp = await ApplicationFaker.create(admin);
    });

    afterAll(async () => {
      await prisma.application.delete({ where: { id: gatedApp.id } });
    });

    // Un domaine gaté = « off → 404, on → tout sauf 404 » : l'oracle vérifie la
    // garde sans dépendre de la sémantique de chaque route.
    const GATED_DOMAINS: { flag: string; path: () => string }[] = [
      { flag: "mdit-campaigns", path: () => "/mdit-campaigns" },
      { flag: "reports", path: () => "/reports" },
      {
        flag: "technology-stack",
        path: () => `/applications/${gatedApp.id}/technologies`,
      },
      {
        flag: "compliances",
        path: () => `/applications/${gatedApp.id}/compliances`,
      },
      { flag: "actors", path: () => `/applications/${gatedApp.id}/actors` },
      { flag: "links", path: () => `/applications/${gatedApp.id}/links` },
      {
        flag: "relations",
        path: () => `/applications/${gatedApp.id}/relations`,
      },
      { flag: "application-history", path: () => "/metadatas" },
      {
        flag: "data-catalog",
        path: () => `/data-catalog/applications/${gatedApp.id}`,
      },
      { flag: "api-tokens", path: () => "/tokens" },
      { flag: "permissions-matrix", path: () => "/actorTypes/perms-matrix" },
    ];

    describe.each(GATED_DOMAINS)("$flag", ({ flag, path }) => {
      afterAll(async () => {
        // Rétablit l'état par défaut pour ne pas impacter d'autres suites.
        await request(app().getHttpServer())
          .patch(`/feature-flags/${flag}`)
          .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
          .send({ enabled: true });
      });

      it("returns 404 on the guarded route when the flag is off", async () => {
        await request(app().getHttpServer())
          .patch(`/feature-flags/${flag}`)
          .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
          .send({ enabled: false })
          .expect(200);

        await request(app().getHttpServer())
          .get(path())
          .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
          .expect(404);
      });

      it("serves the guarded route again once the flag is back on", async () => {
        await request(app().getHttpServer())
          .patch(`/feature-flags/${flag}`)
          .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
          .send({ enabled: true })
          .expect(200);

        const response = await request(app().getHttpServer())
          .get(path())
          .set("Authorization", `Bearer ${ADMIN_TOKEN}`);
        expect(response.status).not.toBe(404);
        expect(response.status).toBeLessThan(500);
      });
    });

    // Nuance tags : le flag « tags-management » ne gate que l'ÉCRITURE admin —
    // la lecture (filtre du catalogue, fiches) reste ouverte flag off.
    describe("tags-management (écriture seulement)", () => {
      afterAll(async () => {
        await request(app().getHttpServer())
          .patch("/feature-flags/tags-management")
          .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
          .send({ enabled: true });
      });

      it("keeps tag reads open but blocks admin writes when off", async () => {
        await request(app().getHttpServer())
          .patch("/feature-flags/tags-management")
          .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
          .send({ enabled: false })
          .expect(200);

        await request(app().getHttpServer())
          .get("/tags")
          .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
          .expect(200);

        await request(app().getHttpServer())
          .post("/tags")
          .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
          .send({ name: `e2e-flg-off-${Date.now()}` })
          .expect(404);
      });
    });
  });

  // Kill-switch impersonation : header refusé (403) quand le flag est off.
  describe("impersonation kill-switch", () => {
    afterAll(async () => {
      await request(app().getHttpServer())
        .patch("/feature-flags/impersonation")
        .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
        .send({ enabled: true });
    });

    it("rejects impersonated requests when the flag is off", async () => {
      await request(app().getHttpServer())
        .patch("/feature-flags/impersonation")
        .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
        .send({ enabled: false })
        .expect(200);

      // Toute requête portant le header d'impersonation est refusée…
      await request(app().getHttpServer())
        .get("/users/me")
        .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
        .set("x-impersonate-user-id", reader.id)
        .expect(403);

      // …et le démarrage d'une impersonation renvoie 404 (garde du endpoint).
      await request(app().getHttpServer())
        .post(`/users/${reader.id}/impersonate`)
        .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
        .expect(404);
    });

    it("allows impersonation again once the flag is back on", async () => {
      await request(app().getHttpServer())
        .patch("/feature-flags/impersonation")
        .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
        .send({ enabled: true })
        .expect(200);

      await request(app().getHttpServer())
        .get("/users/me")
        .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
        .set("x-impersonate-user-id", reader.id)
        .expect(200);
    });
  });
});
