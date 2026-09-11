import type { UserFakerReturnType } from "./fakers/user.faker";
import { AuthLevel, Permission, Roles } from "@prisma/client";
import request from "supertest";
import { OrganizationFaker } from "./fakers/organization.faker";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

// #1985 — Mode `observe` : le niveau est évalué et journalisé sans toucher aux droits, ce qui
// est exactement le contexte dans lequel l'historique des connexions sert au diagnostic.
process.env.AUTH_LEVEL_MODE = "observe";
process.env.AUTH_LEVEL_CLAIM = "auth_mode";
process.env.AUTH_LEVEL_STRONG_VALUES = "CARD";
process.env.AUTH_LEVEL_IDP_CLAIM = "auth_idp";

describe("GET /users/:id/connexion-logs — historique des connexions (#1985)", () => {
  const app = setupTestSuite();
  const suffix = Date.now();

  let globalAdmin: UserFakerReturnType;
  let scopedAdmin: UserFakerReturnType;
  let targetInScope: UserFakerReturnType;
  let targetOutOfScope: UserFakerReturnType;
  let reader: UserFakerReturnType;
  let delegated: UserFakerReturnType;

  beforeAll(async () => {
    const scopeOrg = await OrganizationFaker.create({
      path: `E2E/CNX/DTNUM-${suffix}`,
    });
    const outOfScopeOrg = await OrganizationFaker.create({
      path: `E2E/CNX/DGPN-${suffix}`,
    });
    globalAdmin = await UserFaker.create({ role: Roles.ADMIN });
    scopedAdmin = await UserFaker.create({ role: Roles.ADMIN });
    await scopedAdmin.update({
      scopeOrganization: { connect: { id: scopeOrg.id } },
    });
    targetInScope = await UserFaker.create({ role: Roles.READER });
    await targetInScope.update({
      organization: { connect: { id: scopeOrg.id } },
    });
    targetOutOfScope = await UserFaker.create({ role: Roles.READER });
    await targetOutOfScope.update({
      organization: { connect: { id: outOfScopeOrg.id } },
    });
    reader = await UserFaker.create({ role: Roles.READER });
    // #2498 : `AdminPanelManage` déléguée à un non-admin passe la garde de permissions ; seul le
    // rôle administrateur (second rideau) doit ouvrir cette route.
    delegated = await UserFaker.create({
      role: Roles.READER,
      additionalPermissions: [Permission.AdminPanelManage],
    });

    // Trois contextes du jour, dont deux modes classés faibles : trois lignes attendues.
    for (const claims of [
      { auth_mode: "CARD", auth_idp: "principal" },
      { auth_mode: "PASSWORD", auth_idp: "principal" },
      { auth_mode: "SYNTHETIC_MFA_METHOD", auth_idp: "principal" },
    ]) {
      await request(app().getHttpServer())
        .get("/users/me")
        .set("Authorization", `Bearer ${getToken(targetInScope, claims)}`)
        .expect(200);
    }
  });

  it("renvoie à un administrateur global les dernières connexions avec niveau, mode et fournisseur", async () => {
    const res = await request(app().getHttpServer())
      .get(`/users/${targetInScope.id}/connexion-logs`)
      .set("Authorization", `Bearer ${getToken(globalAdmin)}`)
      .expect(200);

    expect(res.body).toHaveLength(3);
    // De la plus récente à la plus ancienne : même jour, la connexion faible a été journalisée
    // en dernier (tri secondaire sur createdAt).
    expect(res.body.map((row: { authLevel: string }) => row.authLevel)).toEqual(
      [AuthLevel.weak, AuthLevel.weak, AuthLevel.strong],
    );
    expect(res.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          authLevel: AuthLevel.strong,
          authMethod: "CARD",
          authIdp: "principal",
          authSource: "token",
        }),
        expect.objectContaining({
          authLevel: AuthLevel.weak,
          authMethod: "PASSWORD",
          authIdp: "principal",
          authSource: "token",
        }),
      ]),
    );
    // Contrat minimal : rien d'autre que ce que l'administration a besoin de voir.
    expect(Object.keys(res.body[0]).sort()).toEqual([
      "authIdp",
      "authLevel",
      "authMethod",
      "authSource",
      "authTime",
      "id",
    ]);
  });

  it("autorise un administrateur de périmètre sur un utilisateur de son périmètre", async () => {
    const res = await request(app().getHttpServer())
      .get(`/users/${targetInScope.id}/connexion-logs`)
      .set("Authorization", `Bearer ${getToken(scopedAdmin)}`)
      .expect(200);
    expect(res.body).toHaveLength(3);
  });

  it("refuse à un administrateur de périmètre un utilisateur hors périmètre", async () => {
    await request(app().getHttpServer())
      .get(`/users/${targetOutOfScope.id}/connexion-logs`)
      .set("Authorization", `Bearer ${getToken(scopedAdmin)}`)
      .expect(403);
  });

  it("répond 404 à un administrateur de périmètre pour un utilisateur inconnu", async () => {
    await request(app().getHttpServer())
      .get(`/users/00000000-0000-0000-0000-000000000000/connexion-logs`)
      .set("Authorization", `Bearer ${getToken(scopedAdmin)}`)
      .expect(404);
  });

  it("est réservé aux administrateurs", async () => {
    await request(app().getHttpServer())
      .get(`/users/${targetInScope.id}/connexion-logs`)
      .set("Authorization", `Bearer ${getToken(reader)}`)
      .expect(403);
  });

  it("refuse un non-administrateur à qui AdminPanelManage a été déléguée (#2498)", async () => {
    await request(app().getHttpServer())
      .get(`/users/${targetInScope.id}/connexion-logs`)
      .set("Authorization", `Bearer ${getToken(delegated)}`)
      .expect(403);
  });

  // Même règle appliquée à l'historique des droits (route existante, auparavant sans périmètre).
  describe("GET /users/:id/permission-logs — même contrôle de périmètre", () => {
    it("refuse un utilisateur hors périmètre et un non-administrateur délégué", async () => {
      await request(app().getHttpServer())
        .get(`/users/${targetOutOfScope.id}/permission-logs`)
        .set("Authorization", `Bearer ${getToken(scopedAdmin)}`)
        .expect(403);
      await request(app().getHttpServer())
        .get(`/users/${targetInScope.id}/permission-logs`)
        .set("Authorization", `Bearer ${getToken(delegated)}`)
        .expect(403);
    });

    it("reste ouvert dans le périmètre et pour un administrateur global", async () => {
      await request(app().getHttpServer())
        .get(`/users/${targetInScope.id}/permission-logs`)
        .set("Authorization", `Bearer ${getToken(scopedAdmin)}`)
        .expect(200);
      await request(app().getHttpServer())
        .get(`/users/${targetOutOfScope.id}/permission-logs`)
        .set("Authorization", `Bearer ${getToken(globalAdmin)}`)
        .expect(200);
    });
  });
});
