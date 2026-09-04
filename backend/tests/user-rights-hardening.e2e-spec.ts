import { createHash } from "node:crypto";
import { Permission, Roles, TokenStatus } from "@prisma/client";
import request from "supertest";
import { getPrismaClient } from "./fakers/prisma";
import type { UserFakerReturnType } from "./fakers/user.faker";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

const API_KEY_HEADER = "x-refapp-token";
const sha512 = (v: string) => createHash("sha512").update(v).digest("hex");

describe("Durcissement des droits d'administration (#2498, #2502, #2504, #2505)", () => {
  const app = setupTestSuite();
  const prisma = getPrismaClient();
  const suffix = Date.now();

  let admin: UserFakerReturnType;
  let delegated: UserFakerReturnType;
  let victim: UserFakerReturnType;
  let ADMIN_TOKEN: string;
  let DELEGATED_TOKEN: string;

  beforeAll(async () => {
    admin = await UserFaker.create({ role: Roles.ADMIN });
    // Contributeur à qui AdminPanelManage a été délégué directement en base (le DTO refuse
    // désormais cette valeur) : il passe la garde des routes d'administration mais n'a pas le
    // rôle ADMIN, et n'a aucun périmètre.
    delegated = await UserFaker.create({
      role: Roles.CONTRIBUTOR,
      additionalPermissions: [Permission.AdminPanelManage],
    });
    victim = await UserFaker.create({ role: Roles.VISITOR });
    ADMIN_TOKEN = getToken(admin);
    DELEGATED_TOKEN = getToken(delegated);
  });

  describe("#2498 — l'administration des utilisateurs exige le rôle ADMIN", () => {
    it("un non-admin délégué AdminPanelManage ne peut pas modifier les droits d'un utilisateur", async () => {
      await request(app().getHttpServer())
        .patch(`/users/${victim.id}`)
        .set("Authorization", `Bearer ${DELEGATED_TOKEN}`)
        .send({ role: Roles.ADMIN, additionalPermissions: [] })
        .expect(403);
      const unchanged = await prisma.user.findUnique({
        where: { id: victim.id },
      });
      expect(unchanged?.role).toBe(Roles.VISITOR);
    });

    it("… ni se promouvoir lui-même", async () => {
      await request(app().getHttpServer())
        .patch(`/users/${delegated.id}`)
        .set("Authorization", `Bearer ${DELEGATED_TOKEN}`)
        .send({ role: Roles.ADMIN, additionalPermissions: [] })
        .expect(403);
    });

    it("… ni impersonner (#2505)", async () => {
      await request(app().getHttpServer())
        .post(`/users/${victim.id}/impersonate`)
        .set("Authorization", `Bearer ${DELEGATED_TOKEN}`)
        .expect(403);
    });

    it("… ni bloquer", async () => {
      await request(app().getHttpServer())
        .post(`/users/${victim.id}/block`)
        .set("Authorization", `Bearer ${DELEGATED_TOKEN}`)
        .expect(403);
    });

    it("un administrateur ne peut pas changer son propre rôle", async () => {
      await request(app().getHttpServer())
        .patch(`/users/${admin.id}`)
        .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
        .send({ role: Roles.CONTRIBUTOR, additionalPermissions: [] })
        .expect(403);
      const unchanged = await prisma.user.findUnique({
        where: { id: admin.id },
      });
      expect(unchanged?.role).toBe(Roles.ADMIN);
    });

    it("un administrateur peut toujours modifier un autre utilisateur", async () => {
      const res = await request(app().getHttpServer())
        .patch(`/users/${victim.id}`)
        .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
        .send({
          role: Roles.READER,
          additionalPermissions: [Permission.CreateApplication],
        })
        .expect(200);
      expect(res.body.role).toBe(Roles.READER);
      expect(res.body.additionalPermissions).toEqual([
        Permission.CreateApplication,
      ]);
    });
  });

  describe("#2498 — additionalPermissions est une liste fermée", () => {
    it("refuse AdminPanelManage", async () => {
      await request(app().getHttpServer())
        .patch(`/users/${victim.id}`)
        .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
        .send({ additionalPermissions: [Permission.AdminPanelManage] })
        .expect(400);
    });

    it("refuse une permission applicative et une valeur hors enum", async () => {
      await request(app().getHttpServer())
        .patch(`/users/${victim.id}`)
        .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
        .send({ additionalPermissions: [Permission.AppWrite] })
        .expect(400);
      await request(app().getHttpServer())
        .patch(`/users/${victim.id}`)
        .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
        .send({ additionalPermissions: ["SuperAdmin"] })
        .expect(400);
    });
  });

  describe("#2502 — /technical-debts exige MDITList", () => {
    it("refuse un visiteur", async () => {
      const visitor = await UserFaker.create({ role: Roles.VISITOR });
      const token = getToken(visitor);
      await request(app().getHttpServer())
        .get("/technical-debts")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);
      await request(app().getHttpServer())
        .get("/technical-debts/millesimes")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);
    });

    it("accepte un lecteur (MDITList dans le socle Lecteur)", async () => {
      const reader = await UserFaker.create({ role: Roles.READER });
      const token = getToken(reader);
      await request(app().getHttpServer())
        .get("/technical-debts")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      await request(app().getHttpServer())
        .get("/technical-debts/millesimes")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
    });

    it("accepte un visiteur à qui MDITList a été déléguée", async () => {
      const delegatedReader = await UserFaker.create({
        role: Roles.VISITOR,
        additionalPermissions: [Permission.MDITList],
      });
      await request(app().getHttpServer())
        .get("/technical-debts")
        .set("Authorization", `Bearer ${getToken(delegatedReader)}`)
        .expect(200);
    });
  });

  describe("#2504 — un jeton plus faible que son compte ne porte pas ses permissions déléguées", () => {
    let account: UserFakerReturnType;

    beforeAll(async () => {
      account = await UserFaker.create({
        role: Roles.CONTRIBUTOR,
        additionalPermissions: [Permission.DataExport],
      });
    });

    async function createToken(role: Roles) {
      const clear = `e2e-rights-${role}-${suffix}`;
      await prisma.token.create({
        data: {
          name: `e2e-rights-${role}-${suffix}`,
          description: "e2e plafonnement additionalPermissions",
          role,
          hash: sha512(clear),
          expiresAt: new Date(Date.now() + 3_600_000),
          status: TokenStatus.active,
          userIdImpersonate: account.id,
          createdById: admin.id,
        },
      });
      return clear;
    }

    it("jeton VISITOR sur un compte CONTRIBUTOR : rôle plafonné et permissions déléguées retirées", async () => {
      const res = await request(app().getHttpServer())
        .get("/users/me")
        .set(API_KEY_HEADER, await createToken(Roles.VISITOR))
        .expect(200);
      expect(res.body.id).toBe(account.id);
      expect(res.body.role).toBe(Roles.VISITOR);
      expect(res.body.additionalPermissions).toEqual([]);
    });

    it("jeton CONTRIBUTOR sur un compte CONTRIBUTOR : permissions déléguées conservées", async () => {
      const res = await request(app().getHttpServer())
        .get("/users/me")
        .set(API_KEY_HEADER, await createToken(Roles.CONTRIBUTOR))
        .expect(200);
      expect(res.body.role).toBe(Roles.CONTRIBUTOR);
      expect(res.body.additionalPermissions).toEqual([Permission.DataExport]);
    });
  });
});
