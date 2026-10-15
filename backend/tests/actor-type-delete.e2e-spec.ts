import type { AppPermissions } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { Permission, Roles } from "@prisma/client";
import request from "supertest";
import { ActorTypeFaker } from "./fakers/actor-type.faker";
import { getPrismaClient } from "./fakers/prisma";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

type ActorKind = "individuel" | "groupe" | "orphelin";

describe("DELETE /actorTypes/:id — préserver les types utilisés (#2503)", () => {
  const app = setupTestSuite();
  const prisma = getPrismaClient();
  const prefix = `actor-type-delete-${randomUUID()}`;
  const usedMessage =
    "Impossible de supprimer un type d'acteur encore utilisé. Réaffectez ou retirez les acteurs concernés avant de réessayer.";
  let adminToken: string;

  beforeAll(async () => {
    adminToken = getToken(await UserFaker.create({ role: Roles.ADMIN }));
  });

  function remove(actorTypeId: string, token = adminToken) {
    return request(app().getHttpServer())
      .delete(`/actorTypes/${actorTypeId}`)
      .set("Authorization", `Bearer ${token}`);
  }

  async function createUsedType(kind: ActorKind) {
    const actorType = await ActorTypeFaker.create([
      Permission.ActorWrite,
      Permission.TechnologyRead,
    ]);
    const user = await UserFaker.create({ role: Roles.VISITOR });
    const application =
      kind === "orphelin"
        ? null
        : await prisma.application.create({
            data: {
              label: `${prefix}-${kind}-${randomUUID()}`,
              description: "Fixture de protection d'un type d'acteur utilisé",
              quality: 100,
            },
          });
    const organization =
      kind === "groupe"
        ? await prisma.organization.create({
            data: { path: `${prefix}/${randomUUID()}` },
          })
        : null;
    if (organization) {
      await user.update({ organization: { connect: { id: organization.id } } });
    }
    const actor = await prisma.actor.create({
      data: {
        actorTypeId: actorType.id,
        applicationId: application?.id ?? null,
        email: kind === "groupe" ? null : user.email,
        isGroup: kind === "groupe",
        organizationId: organization?.id ?? null,
      },
    });
    return { actorType, actor, application, user };
  }

  async function snapshot(actorTypeId: string, actorId: string) {
    const [actorType, actor, permissions] = await Promise.all([
      prisma.actorType.findUnique({ where: { id: actorTypeId } }),
      prisma.actor.findUnique({ where: { id: actorId } }),
      prisma.appPermissions.findUnique({ where: { actorTypeId } }),
    ]);
    return { actorType, actor, permissions };
  }

  async function matrixRow(actorTypeId: string) {
    const response = await request(app().getHttpServer())
      .get("/actorTypes/perms-matrix")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    const row = (response.body as AppPermissions[]).find(
      (entry) => entry.actorTypeId === actorTypeId,
    );
    expect(row).toBeDefined();
    return row;
  }

  async function appPermissions(
    applicationId: string,
    user: { email: string },
  ) {
    const response = await request(app().getHttpServer())
      .get(`/applications/${applicationId}/my-perms`)
      .set("Authorization", `Bearer ${getToken(user)}`)
      .expect(200);
    return response.body as Permission[];
  }

  it.each<ActorKind>(["individuel", "groupe", "orphelin"])(
    "refuse un type utilisé par un acteur %s et conserve ses liens et ses droits",
    async (kind) => {
      const fixture = await createUsedType(kind);
      const before = await snapshot(fixture.actorType.id, fixture.actor.id);
      const matrixBefore = await matrixRow(fixture.actorType.id);
      const permissionsBefore = fixture.application
        ? await appPermissions(fixture.application.id, fixture.user)
        : null;
      if (permissionsBefore) {
        expect(permissionsBefore).toEqual(
          expect.arrayContaining([
            Permission.ActorWrite,
            Permission.TechnologyRead,
          ]),
        );
      } else {
        expect(before.actor?.applicationId).toBeNull();
      }

      const response = await remove(fixture.actorType.id).expect(409);

      expect(response.body.message).toBe(usedMessage);
      expect(response.body.statusCode).toBe(409);
      expect(await snapshot(fixture.actorType.id, fixture.actor.id)).toEqual(
        before,
      );
      expect(await matrixRow(fixture.actorType.id)).toEqual(matrixBefore);
      if (fixture.application) {
        expect(
          await appPermissions(fixture.application.id, fixture.user),
        ).toEqual(permissionsBefore);
      }
    },
  );

  it.each([
    { role: Roles.VISITOR, scoped: false, status: 403 },
    { role: Roles.READER, scoped: false, status: 403 },
    { role: Roles.CONTRIBUTOR, scoped: false, status: 204 },
    { role: Roles.ADMIN, scoped: false, status: 204 },
    { role: Roles.ADMIN, scoped: true, status: 204 },
  ])(
    "conserve l'autorisation de $role (périmètre : $scoped) et la cascade d'un type inutilisé",
    async ({ role, scoped, status }) => {
      const actorType = await ActorTypeFaker.create([Permission.ActorRead]);
      const permissionsBefore = await prisma.appPermissions.findUniqueOrThrow({
        where: { actorTypeId: actorType.id },
      });
      const user = await UserFaker.create({ role });
      if (scoped) {
        const organization = await prisma.organization.create({
          data: { path: `${prefix}/scope/${randomUUID()}` },
        });
        await user.update({
          scopeOrganization: { connect: { id: organization.id } },
        });
      }

      const response = await remove(actorType.id, getToken(user)).expect(
        status,
      );

      const [remainingType, remainingPermissions] = await Promise.all([
        prisma.actorType.findUnique({ where: { id: actorType.id } }),
        prisma.appPermissions.findUnique({
          where: { actorTypeId: actorType.id },
        }),
      ]);
      if (status === 204) {
        expect(response.text).toBe("");
        expect(remainingType).toBeNull();
        expect(remainingPermissions).toBeNull();
      } else {
        expect(remainingType?.id).toBe(actorType.id);
        expect(remainingPermissions).toEqual(permissionsBefore);
      }
    },
  );

  it("refuse une requête non authentifiée sans supprimer le type", async () => {
    const actorType = await ActorTypeFaker.create();

    await request(app().getHttpServer())
      .delete(`/actorTypes/${actorType.id}`)
      .expect(401);

    expect(
      await prisma.actorType.findUnique({ where: { id: actorType.id } }),
    ).not.toBeNull();
  });

  it("conserve le refus 400 du type système et sa matrice de droits", async () => {
    const actorType = await prisma.actorType.findFirstOrThrow({
      where: { isDefault: true },
    });
    const permissionsBefore = await prisma.appPermissions.findUniqueOrThrow({
      where: { actorTypeId: actorType.id },
    });

    const response = await remove(actorType.id).expect(400);

    expect(response.body.message).toContain("type d'acteur par défaut");
    expect(
      await prisma.actorType.findUnique({ where: { id: actorType.id } }),
    ).toEqual(actorType);
    expect(
      await prisma.appPermissions.findUnique({
        where: { actorTypeId: actorType.id },
      }),
    ).toEqual(permissionsBefore);
  });

  it("conserve le refus 404 d'un identifiant inexistant", async () => {
    const response = await remove(randomUUID()).expect(404);
    expect(response.body.statusCode).toBe(404);
  });

  // Le contrôle métier peut précéder une attribution concurrente. La contrainte
  // PostgreSQL doit donc garantir elle-même qu'aucun Actor n'est détaché du type.
  it.each<ActorKind>(["individuel", "groupe", "orphelin"])(
    "la FK bloque aussi une suppression directe du type d'un acteur %s",
    async (kind) => {
      const fixture = await createUsedType(kind);
      const before = await snapshot(fixture.actorType.id, fixture.actor.id);

      await expect(
        prisma.actorType.delete({ where: { id: fixture.actorType.id } }),
      ).rejects.toMatchObject({
        // Prisma normalise ce refus en P2003 avant PostgreSQL 18 ; sa variante
        // SQLSTATE 23001 reste une UnknownRequestError. La même FK doit refuser.
        message: expect.stringMatching(/\bActor_actorTypeId_fkey\b/),
      });

      expect(await snapshot(fixture.actorType.id, fixture.actor.id)).toEqual(
        before,
      );
      expect(
        await prisma.actor.count({
          where: { actorTypeId: fixture.actorType.id },
        }),
      ).toBe(1);
    },
  );
});
