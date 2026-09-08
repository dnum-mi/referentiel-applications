import type { UserFakerReturnType } from "./fakers/user.faker";
import { Permission, Roles } from "@prisma/client";
import request from "supertest";
import { ActorTypeFaker } from "./fakers/actor-type.faker";
import { ApplicationFaker } from "./fakers/application.faker";
import { OrganizationFaker } from "./fakers/organization.faker";
import { getPrismaClient } from "./fakers/prisma";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

/**
 * #2446 — Un administrateur ayant un périmètre organisationnel administre les utilisateurs et
 * les acteurs de son périmètre, et rien d'autre : les réglages transverses (tags, sources,
 * tokens, batchs, matrice des permissions, directions métier, journal des actions, campagnes…)
 * relèvent de l'administrateur global, seul porteur de `GlobalAdminManage`.
 */
describe("Périmètre d'un administrateur scopé (#2446)", () => {
  const app = setupTestSuite();
  const prisma = getPrismaClient();
  const suffix = Date.now();

  let globalAdmin: UserFakerReturnType;
  let scopedAdmin: UserFakerReturnType;
  let GLOBAL_ADMIN_TOKEN: string;
  let SCOPED_ADMIN_TOKEN: string;

  let actorInScopeId: string;
  let actorOutOfScopeId: string;
  let actorWithoutOrganizationId: string;
  const inScopeEmail = `acteur-in-${suffix}@example.local`;
  const outOfScopeEmail = `acteur-out-${suffix}@example.local`;

  beforeAll(async () => {
    const scopeOrg = await OrganizationFaker.create({
      path: `E2E/PERIM/DTNUM-${suffix}`,
    });
    const inScopeOrg = await OrganizationFaker.create({
      path: `E2E/PERIM/DTNUM-${suffix}/SDAN`,
    });
    const outOfScopeOrg = await OrganizationFaker.create({
      path: `E2E/PERIM/DGPN-${suffix}`,
    });

    globalAdmin = await UserFaker.create({ role: Roles.ADMIN });
    scopedAdmin = await UserFaker.create({ role: Roles.ADMIN });
    await scopedAdmin.update({
      scopeOrganization: { connect: { id: scopeOrg.id } },
    });

    GLOBAL_ADMIN_TOKEN = await getToken(globalAdmin);
    SCOPED_ADMIN_TOKEN = await getToken(scopedAdmin);

    const application = await ApplicationFaker.create(globalAdmin);
    const actorType = await ActorTypeFaker.create();

    const [inScope, outOfScope, withoutOrganization] = await Promise.all([
      prisma.actor.create({
        data: {
          email: inScopeEmail,
          applicationId: application.id,
          actorTypeId: actorType.id,
          organizationId: inScopeOrg.id,
        },
      }),
      prisma.actor.create({
        data: {
          email: outOfScopeEmail,
          applicationId: application.id,
          actorTypeId: actorType.id,
          organizationId: outOfScopeOrg.id,
        },
      }),
      // Acteur sans organisation : dans le périmètre d'aucun administrateur scopé, même règle
      // que pour les utilisateurs (#2371).
      prisma.actor.create({
        data: {
          email: `acteur-sans-orga-${suffix}@example.local`,
          applicationId: application.id,
          actorTypeId: actorType.id,
        },
      }),
    ]);
    actorInScopeId = inScope.id;
    actorOutOfScopeId = outOfScope.id;
    actorWithoutOrganizationId = withoutOrganization.id;
  });

  describe("Permissions dérivées du rôle", () => {
    it("un administrateur global porte GlobalAdminManage et QualityCampaignManage", async () => {
      const response = await request(app().getHttpServer())
        .get("/users/me")
        .set("Authorization", `Bearer ${GLOBAL_ADMIN_TOKEN}`)
        .expect(200);

      expect(response.body.permissions).toContain(Permission.GlobalAdminManage);
      expect(response.body.permissions).toContain(
        Permission.QualityCampaignManage,
      );
    });

    it("un administrateur scopé garde AdminPanelManage mais perd les capacités transverses", async () => {
      const response = await request(app().getHttpServer())
        .get("/users/me")
        .set("Authorization", `Bearer ${SCOPED_ADMIN_TOKEN}`)
        .expect(200);

      expect(response.body.permissions).toContain(Permission.AdminPanelManage);
      expect(response.body.permissions).not.toContain(
        Permission.GlobalAdminManage,
      );
      expect(response.body.permissions).not.toContain(
        Permission.QualityCampaignManage,
      );
    });
  });

  describe("Onglets d'administration transverses fermés au périmètre", () => {
    // Une entrée par onglet du panneau d'administration hors « Utilisateurs » et « Acteurs ».
    const forbiddenReads: [label: string, path: string][] = [
      ["matrice des permissions", "/actorTypes/perms-matrix"],
      ["tokens", "/tokens"],
      ["journal des actions", "/action-logs"],
      ["historique des e-mails", "/email/logs"],
      ["historique global des modifications", "/metadatas"],
      ["revue datasteward", "/correlation-suggestions"],
      ["campagnes de mise en qualité", "/quality-campaigns"],
    ];

    it.each(forbiddenReads)(
      "un administrateur scopé n'accède pas à %s",
      async (_label, path) => {
        await request(app().getHttpServer())
          .get(path)
          .set("Authorization", `Bearer ${SCOPED_ADMIN_TOKEN}`)
          .expect(403);
      },
    );

    it.each(forbiddenReads)(
      "un administrateur global accède à %s",
      async (_label, path) => {
        const response = await request(app().getHttpServer())
          .get(path)
          .set("Authorization", `Bearer ${GLOBAL_ADMIN_TOKEN}`);

        expect(response.status).not.toBe(403);
      },
    );

    const forbiddenWrites: [label: string, path: string, body: object][] = [
      ["créer un tag", "/tags", { label: `tag-${suffix}` }],
      [
        "créer une source",
        "/label-sources",
        { name: `source-${suffix}`, label: `source-${suffix}` },
      ],
      [
        "créer une direction métier",
        "/business-division",
        { label: `direction-${suffix}` },
      ],
      [
        "créer une campagne dette IT",
        "/mdit-campaigns",
        { label: `campagne-${suffix}` },
      ],
      ["lancer le batch MAIA des acteurs", "/actors/sync-maia", {}],
      [
        "lancer le batch MAIA des organisations",
        "/users/sync-organizations-from-maia",
        {},
      ],
    ];

    it.each(forbiddenWrites)(
      "un administrateur scopé ne peut pas %s",
      async (_label, path, body) => {
        await request(app().getHttpServer())
          .post(path)
          .set("Authorization", `Bearer ${SCOPED_ADMIN_TOKEN}`)
          .send(body)
          .expect(403);
      },
    );
  });

  describe("GET /actors — liste filtrée par périmètre", () => {
    it("un administrateur global voit tous les acteurs", async () => {
      const response = await request(app().getHttpServer())
        .get("/actors")
        .query({ page: 0, pageSize: 0 })
        .set("Authorization", `Bearer ${GLOBAL_ADMIN_TOKEN}`)
        .expect(200);

      const ids = response.body.results.map(
        (actor: { id: string }) => actor.id,
      );
      expect(ids).toContain(actorInScopeId);
      expect(ids).toContain(actorOutOfScopeId);
      expect(ids).toContain(actorWithoutOrganizationId);
    });

    it("un administrateur scopé ne voit que les acteurs de son périmètre", async () => {
      const response = await request(app().getHttpServer())
        .get("/actors")
        .query({ page: 0, pageSize: 0 })
        .set("Authorization", `Bearer ${SCOPED_ADMIN_TOKEN}`)
        .expect(200);

      const ids = response.body.results.map(
        (actor: { id: string }) => actor.id,
      );
      expect(ids).toContain(actorInScopeId);
      expect(ids).not.toContain(actorOutOfScopeId);
      expect(ids).not.toContain(actorWithoutOrganizationId);
    });

    it("… y compris pour la recherche des applications d'un acteur par e-mail", async () => {
      const response = await request(app().getHttpServer())
        .get("/actors/applications-by-email")
        .query({ email: outOfScopeEmail })
        .set("Authorization", `Bearer ${SCOPED_ADMIN_TOKEN}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe("Écritures sur un acteur hors périmètre", () => {
    it("la modification unitaire répond 404 sans toucher l'acteur", async () => {
      await request(app().getHttpServer())
        .patch(`/actors/${actorOutOfScopeId}`)
        .set("Authorization", `Bearer ${SCOPED_ADMIN_TOKEN}`)
        .send({ firstname: "Intrus" })
        .expect(404);

      const unchanged = await prisma.actor.findUnique({
        where: { id: actorOutOfScopeId },
      });
      expect(unchanged?.firstname).not.toBe("Intrus");
    });

    it("la suppression unitaire répond 404 sans supprimer l'acteur", async () => {
      await request(app().getHttpServer())
        .delete(`/actors/${actorOutOfScopeId}`)
        .set("Authorization", `Bearer ${SCOPED_ADMIN_TOKEN}`)
        .expect(404);

      const stillThere = await prisma.actor.findUnique({
        where: { id: actorOutOfScopeId },
      });
      expect(stillThere).not.toBeNull();
    });

    it("la modification en masse par e-mail n'atteint aucun acteur hors périmètre", async () => {
      const response = await request(app().getHttpServer())
        .patch("/actors/by-email")
        .set("Authorization", `Bearer ${SCOPED_ADMIN_TOKEN}`)
        .send({ targetEmail: outOfScopeEmail, firstname: "Intrus" })
        .expect(200);

      expect(response.body.count).toBe(0);
      const unchanged = await prisma.actor.findUnique({
        where: { id: actorOutOfScopeId },
      });
      expect(unchanged?.firstname).not.toBe("Intrus");
    });

    it("la suppression en masse par e-mail n'atteint aucun acteur hors périmètre", async () => {
      const response = await request(app().getHttpServer())
        .delete("/actors/by-email")
        .set("Authorization", `Bearer ${SCOPED_ADMIN_TOKEN}`)
        .send({ email: outOfScopeEmail })
        .expect(200);

      expect(response.body.count).toBe(0);
      const stillThere = await prisma.actor.findUnique({
        where: { id: actorOutOfScopeId },
      });
      expect(stillThere).not.toBeNull();
    });

    it("l'acteur de son propre périmètre reste modifiable", async () => {
      await request(app().getHttpServer())
        .patch(`/actors/${actorInScopeId}`)
        .set("Authorization", `Bearer ${SCOPED_ADMIN_TOKEN}`)
        .send({ firstname: "Légitime" })
        .expect(200);

      const updated = await prisma.actor.findUnique({
        where: { id: actorInScopeId },
      });
      expect(updated?.firstname).toBe("Légitime");
    });
  });
});
