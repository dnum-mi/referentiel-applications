import { createHash } from "node:crypto";
import { AuthLevel, Permission, Roles, TokenStatus } from "@prisma/client";
import request from "supertest";
import { roleToPermissions } from "src/permissions/role-to-permissions";
import { ActorTypeFaker } from "./fakers/actor-type.faker";
import { ActorFaker } from "./fakers/actor.faker";
import { ApplicationFaker } from "./fakers/application.faker";
import { OrganizationFaker } from "./fakers/organization.faker";
import { getPrismaClient } from "./fakers/prisma";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

// #1985 — La configuration est lue par l'app Nest de CE fichier (instanciée dans `beforeAll`
// par `setupTestSuite`), donc après ces affectations ; `jest.setup.ts` remet `off` pour les
// autres fichiers. Les valeurs sont celles de docker-compose, jamais celles d'un environnement réel.
process.env.AUTH_LEVEL_MODE = "enforce";
process.env.AUTH_LEVEL_CLAIM = "auth_mode";
process.env.AUTH_LEVEL_STRONG_VALUES = "CARD";
process.env.AUTH_LEVEL_IDP_CLAIM = "auth_idp";
process.env.AUTH_LEVEL_TRUSTED_IDPS = "Partenaire";
// L'env docker-compose pose une page d'aide de démonstration : hors sujet ici.
delete process.env.AUTH_LEVEL_HELP_URL;

const API_KEY_HEADER = "x-refapp-token";
const IMPERSONATE_HEADER = "x-impersonate-user-id";
const sha512 = (value: string) =>
  createHash("sha512").update(value).digest("hex");

const STRONG = { auth_mode: "CARD" };
const WEAK = { auth_mode: "PASSWORD" };

describe("Niveau d'authentification — rétrogradation en session faible (#1985)", () => {
  const app = setupTestSuite();
  const prisma = getPrismaClient();
  const suffix = Date.now();

  let admin: Awaited<ReturnType<typeof UserFaker.create>>;
  let target: Awaited<ReturnType<typeof UserFaker.create>>;
  let scopeOrganizationId: string;

  beforeAll(async () => {
    const scopeOrg = await OrganizationFaker.create({
      path: `E2E/AUTHLEVEL/DTNUM-${suffix}`,
    });
    scopeOrganizationId = scopeOrg.id;
    admin = await UserFaker.create({
      role: Roles.ADMIN,
      additionalPermissions: [Permission.DataExport],
    });
    await admin.update({
      scopeOrganization: { connect: { id: scopeOrg.id } },
      organization: { connect: { id: scopeOrg.id } },
    });
    target = await UserFaker.create({ role: Roles.VISITOR });
    await target.update({ organization: { connect: { id: scopeOrg.id } } });
  });

  describe("GET /users/me", () => {
    it("session forte : droits pleins et niveau exposé", async () => {
      const res = await request(app().getHttpServer())
        .get("/users/me")
        .set("Authorization", `Bearer ${getToken(admin, STRONG)}`)
        .expect(200);

      expect(res.body).toMatchObject({
        id: admin.id,
        role: Roles.ADMIN,
        additionalPermissions: [Permission.DataExport],
        scopeOrganizationId,
        authLevel: {
          level: AuthLevel.strong,
          downgraded: false,
          reason: "strong-method",
        },
      });
      expect(res.body.permissions).toEqual(
        roleToPermissions(Roles.ADMIN, { scoped: true }),
      );
    });

    it("session faible : forme exacte d'un utilisateur standard, rôle d'origine exposé", async () => {
      const res = await request(app().getHttpServer())
        .get("/users/me")
        .set("Authorization", `Bearer ${getToken(admin, WEAK)}`)
        .expect(200);

      expect(res.body).toMatchObject({
        id: admin.id,
        email: admin.email,
        role: Roles.VISITOR,
        additionalPermissions: [],
        scopeOrganizationId: null,
        scopeOrganization: null,
        authLevel: {
          level: AuthLevel.weak,
          downgraded: true,
          reason: "weak-method",
        },
      });
      // Ni rôle d'origine, ni claim brut, ni fournisseur : rien de plus que ces trois clés.
      expect(Object.keys(res.body.authLevel).sort()).toEqual([
        "downgraded",
        "level",
        "reason",
      ]);
      expect(res.body.permissions).toEqual(roleToPermissions(Roles.VISITOR));
      // L'organisation reste : elle sert à la couche 3 et à la traçabilité.
      expect(res.body.organizationId).toBe(scopeOrganizationId);
    });

    it("claim absent : rétrogradé, motif claim-missing", async () => {
      const res = await request(app().getHttpServer())
        .get("/users/me")
        .set("Authorization", `Bearer ${getToken(admin)}`)
        .expect(200);

      expect(res.body).toMatchObject({
        role: Roles.VISITOR,
        authLevel: {
          level: AuthLevel.unknown,
          downgraded: true,
          reason: "claim-missing",
        },
      });
    });

    it("fournisseur fédéré de confiance sans mode : session forte", async () => {
      const res = await request(app().getHttpServer())
        .get("/users/me")
        .set(
          "Authorization",
          `Bearer ${getToken(admin, { auth_idp: "Partenaire" })}`,
        )
        .expect(200);

      expect(res.body).toMatchObject({
        role: Roles.ADMIN,
        authLevel: { level: AuthLevel.strong, reason: "trusted-idp" },
      });
    });

    it("fournisseur non listé sans mode : rétrogradé, motif untrusted-idp", async () => {
      const res = await request(app().getHttpServer())
        .get("/users/me")
        .set(
          "Authorization",
          `Bearer ${getToken(admin, { auth_idp: "Autre" })}`,
        )
        .expect(200);

      expect(res.body).toMatchObject({
        role: Roles.VISITOR,
        authLevel: { level: AuthLevel.unknown, reason: "untrusted-idp" },
      });
    });
  });

  describe("actions réservées", () => {
    it("l'administration des utilisateurs est refusée en session faible", async () => {
      await request(app().getHttpServer())
        .get("/users")
        .set("Authorization", `Bearer ${getToken(admin, WEAK)}`)
        .expect(403);
      await request(app().getHttpServer())
        .get("/users")
        .set("Authorization", `Bearer ${getToken(admin, STRONG)}`)
        .expect(200);
    });

    it("la mise à jour d'un utilisateur est refusée en session faible", async () => {
      await request(app().getHttpServer())
        .patch(`/users/${target.id}`)
        .set("Authorization", `Bearer ${getToken(admin, WEAK)}`)
        .send({ role: Roles.READER })
        .expect(403);
      const untouched = await prisma.user.findUniqueOrThrow({
        where: { id: target.id },
      });
      expect(untouched.role).toBe(Roles.VISITOR);
    });

    it("la création d'un jeton personnel répond un 403 typé stepDown", async () => {
      const res = await request(app().getHttpServer())
        .post("/tokens/personal")
        .set("Authorization", `Bearer ${getToken(admin, WEAK)}`)
        .send({
          name: `perso-${suffix}`,
          description: "jeton personnel en session faible (#1985)",
          expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        })
        .expect(403);

      expect(res.body).toMatchObject({
        stepDown: true,
        reason: "personal-token",
      });
      expect(
        await prisma.token.count({ where: { name: `perso-${suffix}` } }),
      ).toBe(0);
    });
  });

  describe("impersonation", () => {
    it("est refusée en session faible avec un 403 typé, et la session d'audit ouverte est close", async () => {
      // Session ouverte en session forte : c'est elle que la tentative faible doit clore.
      await request(app().getHttpServer())
        .post(`/users/${target.id}/impersonate`)
        .set("Authorization", `Bearer ${getToken(admin, STRONG)}`)
        .expect(200);
      const open = await prisma.impersonationLog.findFirst({
        where: { adminId: admin.id, targetId: target.id, endedAt: null },
      });
      expect(open).not.toBeNull();

      const res = await request(app().getHttpServer())
        .get("/users/me")
        .set("Authorization", `Bearer ${getToken(admin, WEAK)}`)
        .set(IMPERSONATE_HEADER, target.id)
        .expect(403);

      expect(res.body).toMatchObject({
        stepDown: true,
        reason: "impersonation",
      });
      const closed = await prisma.impersonationLog.findUniqueOrThrow({
        where: { id: open!.id },
      });
      expect(closed.endedAt).not.toBeNull();
    });

    // Chemin le plus courant : le front rejoue le header depuis le localStorage sans
    // qu'aucune session d'audit ne soit ouverte — le refus doit être identique, sans erreur.
    it("est refusée en session faible même sans session d'audit ouverte", async () => {
      const res = await request(app().getHttpServer())
        .get("/users/me")
        .set("Authorization", `Bearer ${getToken(admin, WEAK)}`)
        .set(IMPERSONATE_HEADER, target.id)
        .expect(403);
      expect(res.body).toMatchObject({
        stepDown: true,
        reason: "impersonation",
      });
    });

    it("reste possible en session forte (non-régression)", async () => {
      const res = await request(app().getHttpServer())
        .get("/users/me")
        .set("Authorization", `Bearer ${getToken(admin, STRONG)}`)
        .set(IMPERSONATE_HEADER, target.id)
        .expect(200);
      expect(res.body.id).toBe(target.id);
    });
  });

  describe("jetons API", () => {
    const clearToken = `e2e-authlevel-${suffix}`;

    beforeAll(async () => {
      await prisma.token.create({
        data: {
          name: `e2e-authlevel-${suffix}`,
          description: "jeton API : jamais évalué (#1985)",
          role: Roles.ADMIN,
          hash: sha512(clearToken),
          expiresAt: new Date(Date.now() + 3_600_000),
          status: TokenStatus.active,
          userIdImpersonate: admin.id,
          createdById: admin.id,
        },
      });
    });

    it("ne sont jamais rétrogradés ni évalués", async () => {
      const me = await request(app().getHttpServer())
        .get("/users/me")
        .set(API_KEY_HEADER, clearToken)
        .expect(200);
      expect(me.body.role).toBe(Roles.ADMIN);
      expect(me.body.authLevel).toBeUndefined();

      await request(app().getHttpServer())
        .get("/users")
        .set(API_KEY_HEADER, clearToken)
        .expect(200);
    });
  });

  describe("couche 3 (acteurs) et routes qui décrivent l'utilisateur courant", () => {
    let applicationId: string;
    let actor: Awaited<ReturnType<typeof UserFaker.create>>;

    beforeAll(async () => {
      actor = await UserFaker.create({ role: Roles.VISITOR });
      const application = await ApplicationFaker.create(actor);
      applicationId = application.id;
      const writingType = await ActorTypeFaker.create([
        "AppRead",
        "AppWrite",
        "ActorRead",
        "ActorWrite",
      ]);
      await ActorFaker.link({
        userEmail: actor.email,
        actorTypeId: writingType.id,
        applicationId,
      });
    });

    it("un acteur en écriture n'a plus que ses lectures en session faible", async () => {
      const strong = await request(app().getHttpServer())
        .get(`/applications/${applicationId}/my-perms`)
        .set("Authorization", `Bearer ${getToken(actor, STRONG)}`)
        .expect(200);
      expect(strong.body).toEqual(
        expect.arrayContaining(["AppWrite", "ActorWrite", "ActorRead"]),
      );

      const weak = await request(app().getHttpServer())
        .get(`/applications/${applicationId}/my-perms`)
        .set("Authorization", `Bearer ${getToken(actor, WEAK)}`)
        .expect(200);
      expect(weak.body).toEqual(expect.arrayContaining(["ActorRead"]));
      for (const write of ["AppWrite", "ActorWrite"]) {
        expect(weak.body).not.toContain(write);
      }
    });

    // Sans cette garantie, un simple changement de préférence renverrait au front la ligne
    // Prisma relue — rôle réel et périmètre — et la session faible récupérerait l'UI pleine.
    it("PATCH /users/me et les abonnements répondent avec le principal de la session", async () => {
      const preferences = await request(app().getHttpServer())
        .patch("/users/me")
        .set("Authorization", `Bearer ${getToken(admin, WEAK)}`)
        .send({ emailNotificationsEnabled: false })
        .expect(200);
      expect(preferences.body).toMatchObject({
        role: Roles.VISITOR,
        emailNotificationsEnabled: false,
        additionalPermissions: [],
        scopeOrganizationId: null,
        authLevel: { downgraded: true },
      });
      expect(preferences.body.permissions).toEqual(
        roleToPermissions(Roles.VISITOR),
      );

      const subscribed = await request(app().getHttpServer())
        .post(`/users/me/subscribe/${applicationId}`)
        .set("Authorization", `Bearer ${getToken(admin, WEAK)}`)
        .expect(201);
      expect(subscribed.body).toMatchObject({
        role: Roles.VISITOR,
        authLevel: { downgraded: true },
      });
      expect(
        subscribed.body.followedApplications.map((a: { id: string }) => a.id),
      ).toContain(applicationId);

      const unsubscribed = await request(app().getHttpServer())
        .delete(`/users/me/subscribe/${applicationId}`)
        .set("Authorization", `Bearer ${getToken(admin, WEAK)}`)
        .expect(200);
      expect(unsubscribed.body).toMatchObject({ role: Roles.VISITOR });
      expect(unsubscribed.body.followedApplications).toEqual([]);
    });
  });

  describe("journal et configuration", () => {
    it("le journal de connexion porte une ligne par jour et par niveau, avec la valeur brute du claim", async () => {
      // Utilisateur dédié : le test ne dépend ni de l'ordre des autres cas ni de l'heure.
      const journaled = await UserFaker.create({ role: Roles.READER });
      for (const claims of [STRONG, WEAK, {}, { auth_idp: "Partenaire" }]) {
        await request(app().getHttpServer())
          .get("/users/me")
          .set("Authorization", `Bearer ${getToken(journaled, claims)}`)
          .expect(200);
      }

      const rows = await prisma.userConnexionLog.findMany({
        where: { userId: journaled.id },
      });
      // Une ligne par (jour, niveau) : la connexion forte par fournisseur de confiance
      // (même niveau `strong`) ne crée pas de seconde ligne.
      const keys = rows.map(
        (row) => `${row.authTime.toISOString()}|${row.authLevel}`,
      );
      expect(new Set(keys).size).toBe(rows.length);
      expect(new Set(rows.map((row) => row.authLevel))).toEqual(
        new Set([AuthLevel.strong, AuthLevel.weak, AuthLevel.unknown]),
      );
      expect(rows).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            authLevel: AuthLevel.strong,
            authMethod: "CARD",
          }),
          expect.objectContaining({
            authLevel: AuthLevel.weak,
            authMethod: "PASSWORD",
            authIdp: null,
          }),
          expect.objectContaining({
            authLevel: AuthLevel.unknown,
            authMethod: null,
          }),
        ]),
      );
    });

    it("GET /config expose la reconnexion forte et le scope OIDC en mode enforce", async () => {
      const res = await request(app().getHttpServer())
        .get("/config")
        .expect(200);
      expect(res.body).toMatchObject({
        oidcScope: "openid profile email",
        authLevel: { reauth: { prompt: "login" } },
      });
      expect(res.body.authLevel.helpUrl).toBeUndefined();
    });
  });
});
