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
  ) {
    return request(app().getHttpServer())
      .get("/technologies/end-of-life")
      .set("Authorization", `Bearer ${getToken(user)}`)
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

  it.each(supportedRoles)(
    "%s sans capacité ne peut accéder à la vue, même sans périmètre",
    async (role) => {
      await list(await makeUser(role, false, false)).expect(403);
      await list(await makeUser(role, false, true)).expect(403);
    },
  );

  it.each(supportedRoles)(
    "%s avec capacité et périmètre ne voit que les applications autorisées",
    async (role) => {
      const response = await list(await makeUser(role, true, true)).expect(200);
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
    "%s avec capacité et sans périmètre voit toutes les applications",
    async (role) => {
      const response = await list(await makeUser(role, true, false)).expect(
        200,
      );
      expect(response.body.total).toBe(allIds.length);
      expect(
        response.body.results.map((row: { id: string }) => row.id).sort(),
      ).toEqual(allIds);
    },
  );

  it("n'accorde pas une vue globale au profil standard même si la capacité lui a été attribuée", async () => {
    await list(await makeUser(Roles.VISITOR, true, false)).expect(403);
  });

  it("les filtres de recherche, organisation et statut ne peuvent élargir le périmètre", async () => {
    const user = await makeUser(Roles.CONTRIBUTOR, true, true);
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
  });

  it("le total et chaque page portent uniquement sur le périmètre autorisé", async () => {
    const user = await makeUser(Roles.READER, true, true);
    const ids: string[] = [];
    for (let page = 0; page < inScopeIds.length; page++) {
      const response = await list(user, { pageSize: 1, page }).expect(200);
      expect(response.body.total).toBe(inScopeIds.length);
      expect(response.body.results).toHaveLength(1);
      ids.push(response.body.results[0].id);
    }
    expect(ids.sort()).toEqual(inScopeIds);
  });

  it("un périmètre sans application donne une liste vide", async () => {
    const user = await makeUser(Roles.READER, true, true);
    await user.update({ scopeOrganization: { connect: { id: emptyScopeId } } });
    const response = await list(user).expect(200);
    expect(response.body).toMatchObject({ total: 0, results: [] });
  });

  it("réévalue le retrait de capacité et le changement de périmètre à chaque requête", async () => {
    const user = await makeUser(Roles.ADMIN, true, false);
    await list(user).expect(200);
    await user.update({ additionalPermissions: [] });
    await list(user).expect(403);
    await user.update({
      additionalPermissions: [Permission.TechnologyList],
      scopeOrganization: { connect: { id: scopeId } },
    });
    const response = await list(user).expect(200);
    expect(response.body.total).toBe(inScopeIds.length);
  });

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
