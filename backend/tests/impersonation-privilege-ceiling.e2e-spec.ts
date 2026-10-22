import type { Permission as PermissionType } from "@prisma/client";
import type { UserFakerReturnType } from "./fakers/user.faker";
import { randomUUID } from "node:crypto";
import { Permission, Roles } from "@prisma/client";
import request from "supertest";
import { ActorTypeFaker } from "./fakers/actor-type.faker";
import { ApplicationFaker } from "./fakers/application.faker";
import { OrganizationFaker } from "./fakers/organization.faker";
import { getPrismaClient } from "./fakers/prisma";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

const IMPERSONATE_HEADER = "x-impersonate-user-id";

describe("Impersonation — plafond de privilèges (#2925)", () => {
  const app = setupTestSuite();
  const prisma = getPrismaClient();
  const rootPath = `/E2E/IMPERSONATION-${randomUUID()}`;

  let scopedAdmin: UserFakerReturnType;
  let globalAdmin: UserFakerReturnType;
  let delegatedAdmin: UserFakerReturnType;
  let targetGlobalAdmin: UserFakerReturnType;
  let targetUnscopedContributor: UserFakerReturnType;
  let targetUnscopedActor: UserFakerReturnType;
  let targetScopedActor: UserFakerReturnType;
  let targetBroaderScope: UserFakerReturnType;
  let targetNeighbourScope: UserFakerReturnType;
  let targetAdditionalPermission: UserFakerReturnType;
  let targetOutsideOrganization: UserFakerReturnType;
  let targetWithoutOrganization: UserFakerReturnType;
  let targetSameScopeAdmin: UserFakerReturnType;
  let targetSameScopeReader: UserFakerReturnType;
  let targetDescendantContributor: UserFakerReturnType;
  let insideApplicationId: string;
  let outsideApplicationId: string;
  let adminScopeId: string;

  async function createUser(
    role: Roles,
    organizationId: string | null,
    scopeOrganizationId: string | null,
    additionalPermissions: PermissionType[] = [],
  ) {
    const user = await UserFaker.create({ role, additionalPermissions });
    await user.update({
      organization: organizationId
        ? { connect: { id: organizationId } }
        : { disconnect: true },
      scopeOrganization: scopeOrganizationId
        ? { connect: { id: scopeOrganizationId } }
        : { disconnect: true },
    });
    return user;
  }

  beforeAll(async () => {
    const parent = await OrganizationFaker.create({ path: rootPath });
    const audit = await OrganizationFaker.create({ path: `${rootPath}/AUDIT` });
    adminScopeId = audit.id;
    const team = await OrganizationFaker.create({
      path: `${rootPath}/AUDIT/TEAM`,
    });
    // Même préfixe textuel, mais frontière de segment différente.
    const neighbour = await OrganizationFaker.create({
      path: `${rootPath}/AUDIT-OTHER`,
    });

    scopedAdmin = await createUser(Roles.ADMIN, audit.id, audit.id);
    globalAdmin = await createUser(Roles.ADMIN, null, null);
    delegatedAdmin = await createUser(Roles.ADMIN, audit.id, audit.id, [
      Permission.QualityCampaignManage,
    ]);
    targetGlobalAdmin = await createUser(Roles.ADMIN, team.id, null);
    targetUnscopedContributor = await createUser(
      Roles.CONTRIBUTOR,
      team.id,
      null,
    );
    targetUnscopedActor = await createUser(Roles.VISITOR, team.id, null);
    targetScopedActor = await createUser(Roles.VISITOR, team.id, team.id);
    targetBroaderScope = await createUser(Roles.READER, team.id, parent.id);
    targetNeighbourScope = await createUser(
      Roles.READER,
      team.id,
      neighbour.id,
    );
    targetAdditionalPermission = await createUser(
      Roles.READER,
      team.id,
      team.id,
      [Permission.QualityCampaignManage],
    );
    targetOutsideOrganization = await createUser(
      Roles.READER,
      neighbour.id,
      team.id,
    );
    targetWithoutOrganization = await createUser(Roles.READER, null, team.id);
    targetSameScopeAdmin = await createUser(Roles.ADMIN, team.id, audit.id);
    targetSameScopeReader = await createUser(Roles.READER, team.id, audit.id);
    targetDescendantContributor = await createUser(
      Roles.CONTRIBUTOR,
      team.id,
      team.id,
    );

    const actorType = await ActorTypeFaker.create(["AppWrite", "MetadataRead"]);
    const insideApplication = await ApplicationFaker.create(globalAdmin);
    insideApplicationId = insideApplication.id;
    await prisma.actor.create({
      data: {
        applicationId: insideApplicationId,
        actorTypeId: actorType.id,
        email: targetDescendantContributor.email,
        organizationId: team.id,
      },
    });
    const outsideApplication = await ApplicationFaker.create(globalAdmin);
    outsideApplicationId = outsideApplication.id;
    await prisma.actor.create({
      data: {
        applicationId: outsideApplicationId,
        actorTypeId: actorType.id,
        email: targetUnscopedActor.email,
        organizationId: neighbour.id,
      },
    });
    await prisma.actor.create({
      data: {
        applicationId: outsideApplicationId,
        actorTypeId: actorType.id,
        email: targetScopedActor.email,
        organizationId: neighbour.id,
      },
    });
  });

  describe.each(["endpoint", "header"] as const)("Entrée %s", (entryPoint) => {
    function impersonate(admin: UserFakerReturnType, targetId: string) {
      const http = request(app().getHttpServer());
      return entryPoint === "endpoint"
        ? http
            .post(`/users/${targetId}/impersonate`)
            .set("Authorization", `Bearer ${getToken(admin)}`)
        : http
            .get("/users/me")
            .set("Authorization", `Bearer ${getToken(admin)}`)
            .set(IMPERSONATE_HEADER, targetId);
    }

    it.each([
      [
        "administrateur global rattaché à une organisation du périmètre",
        () => targetGlobalAdmin,
      ],
      ["périmètre plus large", () => targetBroaderScope],
      ["périmètre voisin partageant le préfixe", () => targetNeighbourScope],
      [
        "permission additionnelle absente des droits de l'administrateur",
        () => targetAdditionalPermission,
      ],
      [
        "organisation extérieure malgré un périmètre inclus",
        () => targetOutsideOrganization,
      ],
      [
        "organisation absente malgré un périmètre inclus",
        () => targetWithoutOrganization,
      ],
    ] as const)(
      "refuse la cible : %s, sans ouvrir de session",
      async (_label, getTarget) => {
        const target = getTarget();
        const before = await prisma.impersonationLog.count({
          where: { adminId: scopedAdmin.id, targetId: target.id },
        });

        await impersonate(scopedAdmin, target.id).expect(403);

        expect(
          await prisma.impersonationLog.count({
            where: { adminId: scopedAdmin.id, targetId: target.id },
          }),
        ).toBe(before);
      },
    );

    it.each([
      ["administrateur de même périmètre", () => targetSameScopeAdmin],
      ["lecteur de même périmètre", () => targetSameScopeReader],
      [
        "contributeur d'un périmètre descendant",
        () => targetDescendantContributor,
      ],
      [
        "contributeur sans périmètre explicite",
        () => targetUnscopedContributor,
      ],
      ["visiteur sans périmètre explicite", () => targetUnscopedActor],
      ["visiteur acteur avec périmètre descendant", () => targetScopedActor],
    ] as const)(
      "conserve la cible autorisée : %s",
      async (_label, getTarget) => {
        const target = getTarget();
        const response = await impersonate(scopedAdmin, target.id).expect(200);

        expect(response.body.id).toBe(target.id);
        if (
          target.id === targetUnscopedContributor.id ||
          target.id === targetUnscopedActor.id
        ) {
          expect(response.body.scopeOrganizationId).toBe(adminScopeId);
        }
        if (entryPoint === "endpoint") {
          const log = await prisma.impersonationLog.findFirstOrThrow({
            where: { adminId: scopedAdmin.id, targetId: target.id },
            orderBy: { startedAt: "desc" },
          });
          expect(log.adminId).toBe(scopedAdmin.id);
          expect(log.targetId).toBe(target.id);
          expect(log.endedAt).toBeNull();
        }
      },
    );

    it("accepte une permission additionnelle déjà détenue par l'administrateur", async () => {
      const response = await impersonate(
        delegatedAdmin,
        targetAdditionalPermission.id,
      ).expect(200);
      expect(response.body.id).toBe(targetAdditionalPermission.id);
    });

    it.each([
      ["administrateur global", () => targetGlobalAdmin],
      ["utilisateur d'une autre organisation", () => targetOutsideOrganization],
      ["permission additionnelle déléguée", () => targetAdditionalPermission],
    ] as const)(
      "préserve les droits de l'administrateur global : %s",
      async (_label, getTarget) => {
        const target = getTarget();
        const response = await impersonate(globalAdmin, target.id).expect(200);
        expect(response.body.id).toBe(target.id);
      },
    );

    it("refuse un non-administrateur même si la cible a moins de droits", async () => {
      await impersonate(
        targetDescendantContributor,
        targetSameScopeReader.id,
      ).expect(403);
    });

    it("renvoie 404 pour une cible inexistante", async () => {
      await impersonate(scopedAdmin, randomUUID()).expect(404);
    });
  });

  it("prouve que le rôle CONTRIBUTOR sans périmètre ouvre des écritures hors du périmètre de l'administrateur", async () => {
    await request(app().getHttpServer())
      .patch(`/applications/${outsideApplicationId}`)
      .set("Authorization", `Bearer ${getToken(scopedAdmin)}`)
      .send({ description: "Écriture extérieure refusée" })
      .expect(403);

    await request(app().getHttpServer())
      .patch(`/applications/${outsideApplicationId}`)
      .set("Authorization", `Bearer ${getToken(targetUnscopedContributor)}`)
      .send({ description: "Écriture extérieure permise au rôle non scopé" })
      .expect(200);
  });

  it("prouve qu'un VISITOR acteur peut écrire hors périmètre malgré son rôle inférieur", async () => {
    await request(app().getHttpServer())
      .patch(`/applications/${outsideApplicationId}`)
      .set("Authorization", `Bearer ${getToken(targetUnscopedActor)}`)
      .send({ description: "Écriture extérieure permise par le type d'acteur" })
      .expect(200);
  });

  it.each([
    ["contributeur sans périmètre", () => targetUnscopedContributor],
    ["visiteur acteur sans périmètre", () => targetUnscopedActor],
    ["visiteur acteur de périmètre descendant", () => targetScopedActor],
  ] as const)(
    "plafonne les droits applicatifs : %s ne peut pas ouvrir une écriture extérieure",
    async (_label, getTarget) => {
      const target = getTarget();
      const before = await prisma.application.findUniqueOrThrow({
        where: { id: outsideApplicationId },
      });

      const permissions = await request(app().getHttpServer())
        .get(`/applications/${outsideApplicationId}/my-perms`)
        .set("Authorization", `Bearer ${getToken(scopedAdmin)}`)
        .set(IMPERSONATE_HEADER, target.id)
        .expect(200);
      expect(permissions.body).not.toContain(Permission.AppWrite);

      await request(app().getHttpServer())
        .patch(`/applications/${outsideApplicationId}`)
        .set("Authorization", `Bearer ${getToken(scopedAdmin)}`)
        .set(IMPERSONATE_HEADER, target.id)
        .send({ description: "Élévation via rôle ou acteur refusée" })
        .expect(403);

      const after = await prisma.application.findUniqueOrThrow({
        where: { id: outsideApplicationId },
      });
      expect(after.description).toBe(before.description);
    },
  );

  it("conserve une écriture dans le périmètre pour un contributeur sans périmètre explicite", async () => {
    await request(app().getHttpServer())
      .patch(`/applications/${insideApplicationId}`)
      .set("Authorization", `Bearer ${getToken(scopedAdmin)}`)
      .set(IMPERSONATE_HEADER, targetUnscopedContributor.id)
      .send({ description: "Écriture dans le périmètre conservée" })
      .expect(200);

    const application = await prisma.application.findUniqueOrThrow({
      where: { id: insideApplicationId },
    });
    expect(application.description).toBe(
      "Écriture dans le périmètre conservée",
    );
    const unchangedTarget = await prisma.user.findUniqueOrThrow({
      where: { id: targetUnscopedContributor.id },
    });
    expect(unchangedTarget.scopeOrganizationId).toBeNull();
  });

  it("refuse la création d'un jeton personnel sous impersonation scopée sans créer de secret persistant", async () => {
    const data = {
      name: `impersonation-token-${randomUUID()}`,
      description: "Secret personnel interdit sous impersonation scopée",
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    };
    const countBefore = await prisma.token.count({
      where: { createdById: targetUnscopedContributor.id },
    });

    await request(app().getHttpServer())
      .post("/tokens/personal")
      .set("Authorization", `Bearer ${getToken(scopedAdmin)}`)
      .set(IMPERSONATE_HEADER, targetUnscopedContributor.id)
      .send(data)
      .expect(403);

    expect(
      await prisma.token.count({
        where: { createdById: targetUnscopedContributor.id },
      }),
    ).toBe(countBefore);
    expect(await prisma.token.count({ where: { name: data.name } })).toBe(0);
  });

  it("préserve la création personnelle directe et refuse la régénération du secret sous impersonation scopée", async () => {
    const created = await request(app().getHttpServer())
      .post("/tokens/personal")
      .set("Authorization", `Bearer ${getToken(targetUnscopedContributor)}`)
      .send({
        name: `personal-token-${randomUUID()}`,
        description: "Secret personnel créé par son propriétaire réel",
        expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      })
      .expect(201);
    expect(created.body.userImpersonate.id).toBe(targetUnscopedContributor.id);
    const tokenId: string = created.body.id;
    const storedBefore = await prisma.token.findUniqueOrThrow({
      where: { id: tokenId },
    });
    const countBefore = await prisma.token.count({
      where: { createdById: targetUnscopedContributor.id },
    });

    await request(app().getHttpServer())
      .post(`/tokens/${tokenId}/regenerate`)
      .set("Authorization", `Bearer ${getToken(scopedAdmin)}`)
      .set(IMPERSONATE_HEADER, targetUnscopedContributor.id)
      .send({ expiresAt: new Date(Date.now() + 7_200_000).toISOString() })
      .expect(403);

    const storedAfter = await prisma.token.findUniqueOrThrow({
      where: { id: tokenId },
    });
    expect(storedAfter.hash).toBe(storedBefore.hash);
    expect(storedAfter.expiresAt).toEqual(storedBefore.expiresAt);
    expect(storedAfter.status).toBe(storedBefore.status);
    expect(
      await prisma.token.count({
        where: { createdById: targetUnscopedContributor.id },
      }),
    ).toBe(countBefore);
  });

  it("conserve la création personnelle sous impersonation par un administrateur global", async () => {
    const response = await request(app().getHttpServer())
      .post("/tokens/personal")
      .set("Authorization", `Bearer ${getToken(globalAdmin)}`)
      .set(IMPERSONATE_HEADER, targetUnscopedContributor.id)
      .send({
        name: `global-impersonation-token-${randomUUID()}`,
        description: "Parcours administrateur global conservé",
        expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      })
      .expect(201);

    const tokenId: string = response.body.id;
    const stored = await prisma.token.findUniqueOrThrow({
      where: { id: tokenId },
    });
    expect(stored.userIdImpersonate).toBe(targetUnscopedContributor.id);
    expect(stored.createdById).toBe(targetUnscopedContributor.id);
  });

  it("conserve l'administrateur réel dans la trace d'une écriture autorisée sous impersonation", async () => {
    await request(app().getHttpServer())
      .post(`/users/${targetDescendantContributor.id}/impersonate`)
      .set("Authorization", `Bearer ${getToken(scopedAdmin)}`)
      .expect(200);

    await request(app().getHttpServer())
      .patch(`/applications/${insideApplicationId}`)
      .set("Authorization", `Bearer ${getToken(scopedAdmin)}`)
      .set(IMPERSONATE_HEADER, targetDescendantContributor.id)
      .send({ description: "Écriture avec identité et plafond conservés" })
      .expect(200);

    const application = await prisma.application.findUniqueOrThrow({
      where: { id: insideApplicationId },
    });
    expect(application.description).toBe(
      "Écriture avec identité et plafond conservés",
    );
    const metadata = await prisma.metadata.findFirstOrThrow({
      where: { applicationId: insideApplicationId, action: "update" },
      orderBy: { createdAt: "desc" },
    });
    expect(metadata.createdById).toBe(targetDescendantContributor.id);
    expect(metadata.impersonatorId).toBe(scopedAdmin.id);
  });
});
