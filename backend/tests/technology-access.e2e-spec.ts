import { randomUUID } from "node:crypto";
import { Permission, Roles } from "@prisma/client";
import request from "supertest";
import { ActorTypeFaker } from "./fakers/actor-type.faker";
import { getPrismaClient } from "./fakers/prisma";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

describe("Vue Technologies — capacité et périmètre (#2801)", () => {
  const app = setupTestSuite();
  const prisma = getPrismaClient();
  const prefix = `technology-access-${randomUUID()}`;
  const supportedRoles = [Roles.READER, Roles.CONTRIBUTOR, Roles.ADMIN];
  const delegatedRoles = [Roles.READER, Roles.CONTRIBUTOR];
  let scopeId: string;
  let outsideId: string;
  let emptyScopeId: string;
  let directAppId: string;
  let outsideAppId: string;
  let sharedAppId: string;
  let inScopeIds: string[];
  let allIds: string[];

  async function makeUser(role: Roles, capacity: boolean, scoped: boolean) {
    const user = await UserFaker.create({
      role,
      additionalPermissions: capacity ? [Permission.TechnologyList] : [],
    });
    // L'organisation de rattachement ne doit pas remplacer le périmètre fonctionnel.
    await user.update({
      organization: { connect: { id: outsideId } },
      ...(scoped ? { scopeOrganization: { connect: { id: scopeId } } } : {}),
    });
    return user;
  }

  function list(
    user: { email: string },
    query: Record<string, string | number> = {},
    token = getToken(user),
  ) {
    return request(app().getHttpServer())
      .get("/technologies/end-of-life")
      .set("Authorization", `Bearer ${token}`)
      .query({ status: "all", search: prefix, pageSize: 100, ...query });
  }

  beforeAll(async () => {
    const parent = await prisma.organization.create({
      data: { path: `/${prefix}` },
    });
    const scope = await prisma.organization.create({
      data: { path: `/${prefix}/A`, parentId: parent.id },
    });
    const child = await prisma.organization.create({
      data: { path: `/${prefix}/A/CHILD`, parentId: scope.id },
    });
    const similar = await prisma.organization.create({
      data: { path: `/${prefix}/AB` },
    });
    const outside = await prisma.organization.create({
      data: { path: `/${prefix}/B` },
    });
    const empty = await prisma.organization.create({
      data: { path: `/${prefix}/EMPTY` },
    });
    scopeId = scope.id;
    outsideId = outside.id;
    emptyScopeId = empty.id;

    const createApplication = async (
      suffix: string,
      organizationIds: string[] = [],
      businessDivisionId?: string,
    ) => {
      const application = await prisma.application.create({
        data: {
          label: `${prefix}-${suffix}`,
          description: "Fixture des droits de la vue Technologies",
          actors: {
            create: organizationIds.map((organizationId) => ({
              organizationId,
            })),
          },
          ...(businessDivisionId
            ? { businessDivisions: { connect: { id: businessDivisionId } } }
            : {}),
          technologies: {
            create: [
              {
                technology: "Runtime",
                product: `${prefix}-obsolete`,
                version: "1",
                eolDate: new Date("2020-01-01"),
              },
              {
                technology: "Runtime",
                product: `${prefix}-healthy`,
                version: "2",
              },
            ],
          },
        },
      });
      const status = await prisma.applicationStatus.create({
        data: { applicationId: application.id, status: "in_production" },
      });
      return prisma.application.update({
        where: { id: application.id },
        data: { currentStatusId: status.id },
      });
    };
    const division = await prisma.businessDivision.create({
      data: { label: prefix, organizations: { connect: { id: child.id } } },
    });
    const direct = await createApplication("direct", [scope.id]);
    const descendant = await createApplication("child", [child.id]);
    const viaDivision = await createApplication("division", [], division.id);
    const shared = await createApplication("shared", [scope.id, outside.id]);
    const other = await createApplication("outside", [outside.id]);
    const falsePrefix = await createApplication("similar", [similar.id]);
    const orphan = await createApplication("orphan");
    const ancestor = await createApplication("parent", [parent.id]);
    directAppId = direct.id;
    outsideAppId = other.id;
    sharedAppId = shared.id;
    inScopeIds = [direct.id, descendant.id, viaDivision.id, shared.id].sort();
    allIds = [
      ...inScopeIds,
      other.id,
      falsePrefix.id,
      orphan.id,
      ancestor.id,
    ].sort();
  });

  it("refuse une requête non authentifiée", async () => {
    await request(app().getHttpServer())
      .get("/technologies/end-of-life")
      .expect(401);
  });

  it.each([...delegatedRoles, Roles.VISITOR])(
    "%s sans délégation ne peut accéder à la vue, avec ou sans périmètre",
    async (role) => {
      await list(await makeUser(role, false, false)).expect(403);
      await list(await makeUser(role, false, true)).expect(403);
    },
  );

  it.each(supportedRoles)(
    "%s autorisé ne voit que son périmètre (ADMIN sans délégation)",
    async (role) => {
      const user = await makeUser(role, role !== Roles.ADMIN, true);
      if (role === Roles.ADMIN) expect(user.additionalPermissions).toEqual([]);
      const response = await list(user).expect(200);
      expect(response.body.total).toBe(inScopeIds.length);
      expect(
        response.body.results.map((row: { id: string }) => row.id).sort(),
      ).toEqual(inScopeIds);
      expect(
        response.body.results.every(
          (row: { technologies: unknown[] }) => row.technologies.length === 2,
        ),
      ).toBe(true);
    },
  );

  it.each(supportedRoles)(
    "%s autorisé sans périmètre voit toutes les applications (ADMIN sans délégation)",
    async (role) => {
      const user = await makeUser(role, role !== Roles.ADMIN, false);
      if (role === Roles.ADMIN) expect(user.additionalPermissions).toEqual([]);
      const response = await list(user).expect(200);
      expect(response.body.total).toBe(allIds.length);
      expect(
        response.body.results.map((row: { id: string }) => row.id).sort(),
      ).toEqual(allIds);
    },
  );

  it.each([false, true])(
    "expose TechnologyList dans les droits du rôle ADMIN, sans délégation (périmètre : %s)",
    async (scoped) => {
      const user = await makeUser(Roles.ADMIN, false, scoped);
      const response = await request(app().getHttpServer())
        .get("/users/me")
        .set("Authorization", `Bearer ${getToken(user)}`)
        .expect(200);
      expect(response.body.additionalPermissions).toEqual([]);
      expect(response.body.permissions).toContain(Permission.TechnologyList);
    },
  );

  it("n'accorde pas une vue globale au profil standard même si la capacité lui a été attribuée", async () => {
    await list(await makeUser(Roles.VISITOR, true, false)).expect(403);
    await list(await makeUser(Roles.VISITOR, true, true)).expect(403);
  });

  it.each(supportedRoles)(
    "les filtres ne peuvent élargir le périmètre de %s",
    async (role) => {
      const user = await makeUser(role, role !== Roles.ADMIN, true);
      const outside = await list(user, { search: `${prefix}-outside` }).expect(
        200,
      );
      expect(outside.body).toMatchObject({ total: 0, results: [] });

      const organization = await list(user, {
        organization: `/${prefix}/B`,
      }).expect(200);
      expect(
        organization.body.results.map((row: { id: string }) => row.id),
      ).toEqual([sharedAppId]);
      expect(organization.body.total).toBe(1);

      const eol = await list(user, { status: "eol" }).expect(200);
      expect(
        eol.body.results.map((row: { id: string }) => row.id).sort(),
      ).toEqual(inScopeIds);
      expect(
        eol.body.results.every(
          (row: { technologies: unknown[] }) => row.technologies.length === 1,
        ),
      ).toBe(true);
    },
  );

  it.each(supportedRoles)(
    "le total et chaque page respectent le périmètre de %s",
    async (role) => {
      const user = await makeUser(role, role !== Roles.ADMIN, true);
      const ids: string[] = [];
      for (let page = 0; page < inScopeIds.length; page++) {
        const response = await list(user, { pageSize: 1, page }).expect(200);
        expect(response.body.total).toBe(inScopeIds.length);
        expect(response.body.results).toHaveLength(1);
        ids.push(response.body.results[0].id);
      }
      expect(ids.sort()).toEqual(inScopeIds);
    },
  );

  it("un périmètre sans application donne une liste vide", async () => {
    const user = await makeUser(Roles.READER, true, true);
    await user.update({ scopeOrganization: { connect: { id: emptyScopeId } } });
    const response = await list(user).expect(200);
    expect(response.body).toMatchObject({ total: 0, results: [] });
  });

  it.each(delegatedRoles)(
    "réévalue le retrait de délégation et le périmètre de %s avec le même jeton",
    async (role) => {
      const user = await makeUser(role, true, false);
      const token = getToken(user);
      await list(user, {}, token).expect(200);
      await user.update({ additionalPermissions: [] });
      await list(user, {}, token).expect(403);
      await user.update({
        additionalPermissions: [Permission.TechnologyList],
        scopeOrganization: { connect: { id: scopeId } },
      });
      const response = await list(user, {}, token).expect(200);
      expect(response.body.total).toBe(inScopeIds.length);
      expect(
        response.body.results.map((row: { id: string }) => row.id).sort(),
      ).toEqual(inScopeIds);
    },
  );

  it.each([false, true])(
    "un ADMIN conserve la capacité du rôle après retrait de sa délégation (périmètre : %s)",
    async (scoped) => {
      const user = await makeUser(Roles.ADMIN, true, scoped);
      const token = getToken(user);
      await list(user, {}, token).expect(200);
      await user.update({ additionalPermissions: [] });

      const response = await list(user, {}, token).expect(200);
      const expectedIds = scoped ? inScopeIds : allIds;
      expect(response.body.total).toBe(expectedIds.length);
      expect(
        response.body.results.map((row: { id: string }) => row.id).sort(),
      ).toEqual(expectedIds);
    },
  );

  it("réévalue le périmètre d'un ADMIN sans délégation avec le même jeton", async () => {
    const user = await makeUser(Roles.ADMIN, false, false);
    const token = getToken(user);
    const globalResponse = await list(user, {}, token).expect(200);
    expect(globalResponse.body.total).toBe(allIds.length);

    await user.update({ scopeOrganization: { connect: { id: scopeId } } });
    const scoped = await list(user, {}, token).expect(200);
    expect(scoped.body.total).toBe(inScopeIds.length);
    expect(
      scoped.body.results.map((row: { id: string }) => row.id).sort(),
    ).toEqual(inScopeIds);

    await user.update({ scopeOrganization: { connect: { id: emptyScopeId } } });
    const empty = await list(user, {}, token).expect(200);
    expect(empty.body).toMatchObject({ total: 0, results: [] });
  });

  it.each([...delegatedRoles, Roles.VISITOR])(
    "révoque la capacité issue du rôle dès la rétrogradation ADMIN vers %s",
    async (role) => {
      const user = await makeUser(Roles.ADMIN, false, true);
      const token = getToken(user);
      await list(user, {}, token).expect(200);
      await user.update({ role });
      await list(user, {}, token).expect(403);
    },
  );

  it.each(delegatedRoles)(
    "la rétrogradation ADMIN vers %s conserve uniquement une délégation explicite encore présente",
    async (role) => {
      const user = await makeUser(Roles.ADMIN, true, true);
      const token = getToken(user);
      await list(user, {}, token).expect(200);
      await user.update({ role });
      const response = await list(user, {}, token).expect(200);
      expect(response.body.total).toBe(inScopeIds.length);
      expect(
        response.body.results.map((row: { id: string }) => row.id).sort(),
      ).toEqual(inScopeIds);

      await user.update({ additionalPermissions: [] });
      await list(user, {}, token).expect(403);
    },
  );

  it("les droits d'acteur hors périmètre n'élargissent pas la vue transverse", async () => {
    const user = await makeUser(Roles.READER, true, true);
    const actorType = await ActorTypeFaker.create([Permission.TechnologyRead]);
    await prisma.actor.create({
      data: {
        applicationId: outsideAppId,
        email: user.email,
        actorTypeId: actorType.id,
      },
    });
    await request(app().getHttpServer())
      .get(`/applications/${outsideAppId}/technologies`)
      .set("Authorization", `Bearer ${getToken(user)}`)
      .expect(200);
    const response = await list(user).expect(200);
    expect(
      response.body.results.map((row: { id: string }) => row.id).sort(),
    ).toEqual(inScopeIds);
  });

  it("la capacité n'accorde pas l'écriture et son absence ne retire pas les droits des fiches", async () => {
    const reader = await makeUser(Roles.READER, true, true);
    await request(app().getHttpServer())
      .post(`/applications/${directAppId}/technologies`)
      .set("Authorization", `Bearer ${getToken(reader)}`)
      .send({ technology: "Runtime", product: "Unauthorized" })
      .expect(403);
    const contributor = await makeUser(Roles.CONTRIBUTOR, false, true);
    await request(app().getHttpServer())
      .get(`/applications/${directAppId}/technologies`)
      .set("Authorization", `Bearer ${getToken(contributor)}`)
      .expect(200);
  });
});
