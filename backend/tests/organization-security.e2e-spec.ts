import { ConflictException } from "@nestjs/common";
import { Permission, Roles } from "@prisma/client";
import { OrganizationsService } from "src/organizations/organizations.service";
import request from "supertest";
import { OrganizationFaker } from "./fakers/organization.faker";
import { getPrismaClient } from "./fakers/prisma";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

describe("Organisations — protection des périmètres (#2800)", () => {
  const app = setupTestSuite();
  const prisma = getPrismaClient();
  let globalAdminToken: string;

  beforeAll(async () => {
    globalAdminToken = getToken(await UserFaker.create({ role: Roles.ADMIN }));
  });

  const forbiddenPrincipals = [
    { label: "contributeur", role: Roles.CONTRIBUTOR, scoped: false },
    { label: "administrateur de périmètre", role: Roles.ADMIN, scoped: true },
    {
      label: "contributeur avec une ancienne délégation OrganizationManage",
      role: Roles.CONTRIBUTOR,
      scoped: false,
      additionalPermissions: [Permission.OrganizationManage],
    },
    {
      label:
        "administrateur de périmètre avec une ancienne délégation OrganizationManage",
      role: Roles.ADMIN,
      scoped: true,
      additionalPermissions: [Permission.OrganizationManage],
    },
  ];

  describe.each(forbiddenPrincipals)("$label", (principal) => {
    let token: string;
    let organizationId: string;
    let organizationPath: string;
    let scopedAdminId: string;

    beforeAll(async () => {
      const organization = await OrganizationFaker.create();
      organizationId = organization.id;
      organizationPath = organization.path;
      const user = await UserFaker.create({
        role: principal.role,
        additionalPermissions: principal.additionalPermissions,
      });
      const scopedAdmin = principal.scoped
        ? user
        : await UserFaker.create({ role: Roles.ADMIN });
      await scopedAdmin.update({
        scopeOrganization: { connect: { id: organizationId } },
      });
      scopedAdminId = scopedAdmin.id;
      token = getToken(user);
    });

    it("peut consulter les organisations mais ne peut pas en créer", async () => {
      await request(app().getHttpServer())
        .get(`/organizations/${organizationId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const newPath = `E2E/ORGANIZATION-SECURITY/${organizationId}`;
      await request(app().getHttpServer())
        .post("/organizations")
        .set("Authorization", `Bearer ${token}`)
        .send({ path: newPath })
        .expect(403);
      expect(
        await prisma.organization.count({ where: { path: newPath } }),
      ).toBe(0);
    });

    it("ne peut ni vider ni élargir un chemin de périmètre", async () => {
      for (const path of ["", "E2E"]) {
        await request(app().getHttpServer())
          .patch(`/organizations/${organizationId}`)
          .set("Authorization", `Bearer ${token}`)
          .send({ path })
          .expect(403);
      }

      const organization = await prisma.organization.findUniqueOrThrow({
        where: { id: organizationId },
      });
      expect(organization.path).toBe(organizationPath);
    });

    it("ne peut pas supprimer le périmètre d'un administrateur", async () => {
      await request(app().getHttpServer())
        .delete(`/organizations/${organizationId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      const scopedAdmin = await prisma.user.findUniqueOrThrow({
        where: { id: scopedAdminId },
      });
      expect(scopedAdmin.scopeOrganizationId).toBe(organizationId);

      const response = await request(app().getHttpServer())
        .get("/users/me")
        .set("Authorization", `Bearer ${getToken(scopedAdmin)}`)
        .expect(200);
      expect(response.body.permissions).not.toContain(
        Permission.GlobalAdminManage,
      );
    });

    it("ne peut pas rediriger les références MAIA vers une autre organisation", async () => {
      const maiaRef = `E2E/ORGANIZATION-SECURITY/${organizationId}`;
      await request(app().getHttpServer())
        .post("/organization-maia-references")
        .set("Authorization", `Bearer ${token}`)
        .send({ maiaRef, organizationId })
        .expect(403);

      const reference = await prisma.organizationMaiaReference.create({
        data: { maiaRef, organizationId },
      });
      await request(app().getHttpServer())
        .delete(`/organization-maia-references/${reference.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(403);

      expect(
        await prisma.organizationMaiaReference.findUnique({
          where: { id: reference.id },
        }),
      ).not.toBeNull();
    });
  });

  it.each(["", "   ", null])(
    "refuse un chemin vide ou nul (%j), même pour l'administrateur global",
    async (path) => {
      await request(app().getHttpServer())
        .post("/organizations")
        .set("Authorization", `Bearer ${globalAdminToken}`)
        .send({ path })
        .expect(400);

      const organization = await OrganizationFaker.create();
      await request(app().getHttpServer())
        .patch(`/organizations/${organization.id}`)
        .set("Authorization", `Bearer ${globalAdminToken}`)
        .send({ path })
        .expect(400);

      expect(
        await prisma.organization.findUniqueOrThrow({
          where: { id: organization.id },
        }),
      ).toMatchObject({ path: organization.path });
    },
  );

  it("exige la réaffectation explicite d'un périmètre avant sa suppression par l'administrateur global", async () => {
    const organization = await OrganizationFaker.create();
    const scopedAdmin = await UserFaker.create({ role: Roles.ADMIN });
    await scopedAdmin.update({
      scopeOrganization: { connect: { id: organization.id } },
    });

    await request(app().getHttpServer())
      .delete(`/organizations/${organization.id}`)
      .set("Authorization", `Bearer ${globalAdminToken}`)
      .expect(409);

    await expect(
      app().get(OrganizationsService).deleteSafe(organization.id, true),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(
      await prisma.user.findUniqueOrThrow({ where: { id: scopedAdmin.id } }),
    ).toMatchObject({ scopeOrganizationId: organization.id });

    const replacement = await OrganizationFaker.create();
    await request(app().getHttpServer())
      .patch(`/users/${scopedAdmin.id}`)
      .set("Authorization", `Bearer ${globalAdminToken}`)
      .send({ scopeOrganizationId: replacement.id, additionalPermissions: [] })
      .expect(200);

    await request(app().getHttpServer())
      .delete(`/organizations/${organization.id}`)
      .set("Authorization", `Bearer ${globalAdminToken}`)
      .expect(204);

    expect(
      await prisma.user.findUniqueOrThrow({ where: { id: scopedAdmin.id } }),
    ).toMatchObject({ scopeOrganizationId: replacement.id });
    expect(
      await prisma.organization.findUnique({
        where: { id: organization.id },
      }),
    ).toBeNull();
  });
});
