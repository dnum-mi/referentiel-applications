import { Permission, Roles } from "@prisma/client";
import request from "supertest";
import { OrganizationFaker } from "./fakers/organization.faker";
import { getPrismaClient } from "./fakers/prisma";
import { UserFaker, type UserFakerReturnType } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

// Données fictives : une branche régionale, plusieurs bureaux, et un admin local
// consulté directement ou via « Se connecter en tant que ». Aucun compte réel.
describe("Administration locale — format du chemin de périmètre", () => {
  const app = setupTestSuite();
  const prisma = getPrismaClient();
  const root = "ROOT/REGION/LOCAL";
  let globalAdmin: UserFakerReturnType;
  let scopedAdmin: UserFakerReturnType;
  let member: UserFakerReturnType;
  let outside: UserFakerReturnType;
  let withoutOrganization: UserFakerReturnType;
  let scopeIds: Record<string, string>;
  let expectedIds: string[];

  beforeAll(async () => {
    const scopePaths = [root, `${root}/`, `${root}///`, "///"];
    scopeIds = {};
    for (const path of scopePaths) {
      const organization = await OrganizationFaker.create({ path });
      scopeIds[path] = organization.id;
    }
    const bureau = await OrganizationFaker.create({
      path: `${root}/UNIT/TEAM_A`,
    });
    const otherBureau = await OrganizationFaker.create({
      path: `${root}/UNIT/TEAM_B`,
    });
    const neighboringBranch = await OrganizationFaker.create({
      path: `${root}-OTHER/UNIT`,
    });
    globalAdmin = await UserFaker.create({ role: Roles.ADMIN });
    scopedAdmin = await UserFaker.create({ role: Roles.ADMIN });
    await scopedAdmin.update({
      organization: { connect: { id: bureau.id } },
      scopeOrganization: { connect: { id: scopeIds[root] } },
    });
    member = await UserFaker.create();
    await member.update({ organization: { connect: { id: otherBureau.id } } });
    const rootMember = await UserFaker.create();
    await rootMember.update({
      organization: { connect: { id: scopeIds[root] } },
    });
    outside = await UserFaker.create();
    await outside.update({
      organization: { connect: { id: neighboringBranch.id } },
    });
    withoutOrganization = await UserFaker.create();
    expectedIds = [scopedAdmin.id, member.id, rootMember.id];
  });

  it.each([
    { suffix: "", impersonated: false },
    { suffix: "/", impersonated: false },
    { suffix: "/", impersonated: true },
    { suffix: "///", impersonated: true },
  ])(
    "liste les utilisateurs avec suffixe '$suffix', impersonation=$impersonated",
    async ({ suffix, impersonated }) => {
      await scopedAdmin.update({
        scopeOrganization: { connect: { id: scopeIds[`${root}${suffix}`] } },
      });
      const headers: Record<string, string> = {
        Authorization: `Bearer ${getToken(impersonated ? globalAdmin : scopedAdmin)}`,
      };
      if (impersonated) {
        await request(app().getHttpServer())
          .post(`/users/${scopedAdmin.id}/impersonate`)
          .set(headers)
          .expect(200);
        headers["x-impersonate-user-id"] = scopedAdmin.id;
      }

      const me = await request(app().getHttpServer())
        .get("/users/me")
        .set(headers)
        .expect(200);
      expect(me.body.id).toBe(scopedAdmin.id);
      expect(me.body.permissions).toContain(Permission.AdminPanelManage);
      expect(me.body.scopeOrganization.path).toBe(`${root}${suffix}`);

      const response = await request(app().getHttpServer())
        .get("/users")
        .query({ page: 0, pageSize: 15, search: "region/local" })
        .set(headers)
        .expect(200);
      expect(response.body.total).toBe(expectedIds.length);
      expect(
        response.body.results.map((user: { id: string }) => user.id).sort(),
      ).toEqual([...expectedIds].sort());
    },
  );

  it("permet la gestion d'un utilisateur dans le périmètre terminé par /", async () => {
    await scopedAdmin.update({
      scopeOrganization: { connect: { id: scopeIds[`${root}/`] } },
    });
    await request(app().getHttpServer())
      .patch(`/users/${member.id}`)
      .set("Authorization", `Bearer ${getToken(scopedAdmin)}`)
      .send({ role: Roles.READER, additionalPermissions: [] })
      .expect(200);
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: member.id } })).role,
    ).toBe(Roles.READER);
  });

  it("garde les utilisateurs hors périmètre et sans organisation inaccessibles", async () => {
    await scopedAdmin.update({
      scopeOrganization: { connect: { id: scopeIds[`${root}/`] } },
    });
    for (const target of [outside, withoutOrganization]) {
      await request(app().getHttpServer())
        .patch(`/users/${target.id}`)
        .set("Authorization", `Bearer ${getToken(scopedAdmin)}`)
        .send({ role: Roles.READER, additionalPermissions: [] })
        .expect(403);
      expect(
        (await prisma.user.findUniqueOrThrow({ where: { id: target.id } }))
          .role,
      ).toBe(Roles.VISITOR);
    }
  });

  it("un périmètre constitué seulement de / ne devient jamais un accès global", async () => {
    await scopedAdmin.update({
      scopeOrganization: { connect: { id: scopeIds["///"] } },
    });
    const response = await request(app().getHttpServer())
      .get("/users")
      .set("Authorization", `Bearer ${getToken(scopedAdmin)}`)
      .expect(200);
    expect(response.body).toMatchObject({ total: 0, results: [] });
    await request(app().getHttpServer())
      .patch(`/users/${member.id}`)
      .set("Authorization", `Bearer ${getToken(scopedAdmin)}`)
      .send({ role: Roles.VISITOR, additionalPermissions: [] })
      .expect(403);
  });
});
