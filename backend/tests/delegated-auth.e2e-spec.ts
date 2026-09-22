import { createHash, randomUUID } from "node:crypto";
import { Permission, Roles, TokenStatus, UserType } from "@prisma/client";
import request from "supertest";
import { ApplicationSearchService } from "src/applications/search/application-search.service";
import { ActorFaker } from "./fakers/actor.faker";
import { ActorTypeFaker } from "./fakers/actor-type.faker";
import { ApplicationFaker } from "./fakers/application.faker";
import { OrganizationFaker } from "./fakers/organization.faker";
import { getPrismaClient } from "./fakers/prisma";
import type { UserFakerReturnType } from "./fakers/user.faker";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

// Le JWT humain présenté par le tiers reste soumis au contrôle SSO #1985.
process.env.AUTH_LEVEL_MODE = "enforce";
process.env.AUTH_LEVEL_CLAIM = "auth_mode";
process.env.AUTH_LEVEL_STRONG_VALUES = "CARD";
process.env.AUTH_LEVEL_USERINFO_FALLBACK = "false";
delete process.env.AUTH_LEVEL_TRUSTED_IDPS;

const API_KEY_HEADER = "x-refapp-token";
const IMPERSONATE_HEADER = "x-impersonate-user-id";
const STRONG = { auth_mode: "CARD" };

describe("Accès d'un utilisateur via un système tiers (#1988)", () => {
  const app = setupTestSuite();
  const prisma = getPrismaClient();

  let admin: UserFakerReturnType;
  let sam: UserFakerReturnType;
  let writer: UserFakerReturnType;
  let application: Awaited<ReturnType<typeof ApplicationFaker.create>>;
  let readerService: Awaited<ReturnType<typeof createService>>;
  let adminService: Awaited<ReturnType<typeof createService>>;
  let emptyActorTypeId: string;
  let writerActorTypeId: string;

  async function createToken(
    principal: { id: string; role: Roles },
    options: {
      role?: Roles;
      status?: TokenStatus;
      expiresAt?: Date;
      createdById?: string;
    } = {},
  ) {
    const password = `e2e-delegated-${randomUUID()}`;
    const token = await prisma.token.create({
      data: {
        name: password,
        description: "Contrôle des accès délégués #1988",
        hash: createHash("sha512").update(password).digest("hex"),
        role: options.role ?? principal.role,
        status: options.status ?? TokenStatus.active,
        expiresAt: options.expiresAt ?? new Date(Date.now() + 3_600_000),
        userIdImpersonate: principal.id,
        createdById: options.createdById ?? admin.id,
      },
    });
    return { ...token, password };
  }

  async function createService(
    role: Roles,
    options: { scopeOrganizationId?: string; isBlocked?: boolean } = {},
  ) {
    const user = await prisma.user.create({
      data: {
        email: `e2e-service-${randomUUID()}@bot.internal`,
        type: UserType.bot,
        role,
        ...options,
      },
    });
    return { user, token: await createToken(user) };
  }

  function credentials(
    token: { password: string },
    human: { email: string },
    claims: Record<string, unknown> = STRONG,
  ) {
    return {
      Authorization: `Bearer ${getToken(human, claims)}`,
      [API_KEY_HEADER]: token.password,
    };
  }

  async function linkActor(
    user: { email: string },
    applicationId: string,
    actorTypeId = writerActorTypeId,
    organizationId?: string,
  ) {
    return prisma.actor.create({
      data: {
        email: user.email,
        applicationId,
        actorTypeId,
        organizationId,
      },
    });
  }

  beforeAll(async () => {
    // L'indexation différée est hors du contrat d'autorisation et ne doit pas
    // se réveiller après la suppression de la base de cette suite.
    jest
      .spyOn(app().get(ApplicationSearchService), "scheduleRefresh")
      .mockImplementation(() => undefined);
    admin = await UserFaker.create({ role: Roles.ADMIN });
    sam = await UserFaker.create({ role: Roles.VISITOR });
    writer = await UserFaker.create({ role: Roles.VISITOR });
    application = await ApplicationFaker.create(admin);
    emptyActorTypeId = (await ActorTypeFaker.create()).id;
    writerActorTypeId = (
      await ActorTypeFaker.create(["ActorRead", "ActorWrite", "AppWrite"])
    ).id;
    // Des droits explicites évitent que le type d'acteur par défaut influence la fixture.
    await linkActor(sam, application.id, emptyActorTypeId);
    await linkActor(writer, application.id);
    readerService = await createService(Roles.READER);
    adminService = await createService(Roles.ADMIN);
  });

  it("Sam VISITOR reste visiteur avec un service READER et ne gagne pas ActorRead", async () => {
    const headers = credentials(readerService.token, sam);
    const profile = await request(app().getHttpServer())
      .get("/users/me")
      .set(headers)
      .expect(200);

    expect(profile.body).toMatchObject({
      id: sam.id,
      type: UserType.human,
      role: Roles.VISITOR,
    });
    expect(profile.body.permissions).not.toContain(Permission.AdminPanelManage);
    expect(profile.body.permissions).not.toContain(Permission.MDITList);

    const permissions = await request(app().getHttpServer())
      .get(`/applications/${application.id}/my-perms`)
      .set(headers)
      .expect(200);
    expect(permissions.body).not.toContain(Permission.ActorRead);
    expect(permissions.body).not.toContain(Permission.AppWrite);

    await request(app().getHttpServer())
      .get(`/applications/${application.id}/actors`)
      .set(headers)
      .expect(403);
  });

  it("un service READER plafonne les droits d'un acteur écrivain dans my-perms et sur une vraie écriture", async () => {
    // Même un rôle d'acteur attribué au bot ne doit pas relever le plafond du jeton.
    await ActorFaker.link({
      userEmail: readerService.user.email,
      actorTypeId: writerActorTypeId,
      applicationId: application.id,
    });
    const headers = credentials(readerService.token, writer);
    const permissions = await request(app().getHttpServer())
      .get(`/applications/${application.id}/my-perms`)
      .set(headers)
      .expect(200);
    expect(permissions.body).toContain(Permission.ActorRead);
    expect(permissions.body).not.toContain(Permission.AppWrite);
    expect(permissions.body).not.toContain(Permission.ActorWrite);

    await request(app().getHttpServer())
      .get(`/applications/${application.id}/actors`)
      .set(headers)
      .expect(200);
    await request(app().getHttpServer())
      .patch(`/applications/${application.id}`)
      .set(headers)
      .send({ description: "Écriture interdite au service lecteur" })
      .expect(403);
    expect(
      await prisma.application.findUniqueOrThrow({
        where: { id: application.id },
      }),
    ).toMatchObject({ description: application.description });
  });

  it("un acteur VISITOR autorisé écrit via un service ADMIN sans devenir administrateur", async () => {
    const headers = credentials(adminService.token, writer);
    const permissions = await request(app().getHttpServer())
      .get(`/applications/${application.id}/my-perms`)
      .set(headers)
      .expect(200);
    expect(permissions.body).toContain(Permission.AppWrite);

    const description = "Modification légitime par l'acteur humain";
    await request(app().getHttpServer())
      .patch(`/applications/${application.id}`)
      .set(headers)
      .send({ description })
      .expect(200);
    expect(
      await prisma.application.findUniqueOrThrow({
        where: { id: application.id },
      }),
    ).toMatchObject({ description });
    expect(
      await prisma.metadata.findFirst({
        where: { applicationId: application.id, action: "update" },
        orderBy: { createdAt: "desc" },
      }),
    ).toMatchObject({ createdById: writer.id, impersonatorId: null });

    const profile = await request(app().getHttpServer())
      .get("/users/me")
      .set(headers)
      .expect(200);
    expect(profile.body).toMatchObject({ id: writer.id, role: Roles.VISITOR });
    await request(app().getHttpServer())
      .get("/tokens")
      .set(headers)
      .expect(403);
  });

  it("refuse un service seul sans JWT humain", async () => {
    await request(app().getHttpServer())
      .get("/users/me")
      .set(API_KEY_HEADER, readerService.token.password)
      .expect(401);
  });

  it("refuse un utilisateur inconnu sans le provisionner dans RefApp", async () => {
    const unknown = { email: `unknown-${randomUUID()}@example.local` };
    await request(app().getHttpServer())
      .get("/users/me")
      .set(credentials(adminService.token, unknown))
      .expect(401);
    expect(
      await prisma.user.count({
        where: { email: { equals: unknown.email, mode: "insensitive" } },
      }),
    ).toBe(0);
  });

  it("refuse l'identité d'un bot dans le JWT supposé humain", async () => {
    await request(app().getHttpServer())
      .get("/users/me")
      .set(credentials(adminService.token, readerService.user))
      .expect(401);
  });

  it("refuse un JWT humain malformé sans se rabattre sur les droits du service", async () => {
    await request(app().getHttpServer())
      .get("/users/me")
      .set(API_KEY_HEADER, adminService.token.password)
      .set("Authorization", "Bearer malformed-jwt")
      .expect(401);
  });

  it.each(["humain", "service"])(
    "refuse avec 403 quand le compte %s est bloqué",
    async (blockedPrincipal) => {
      const human = await UserFaker.create({ role: Roles.READER });
      const service = await createService(Roles.READER);
      await prisma.user.update({
        where: {
          id: blockedPrincipal === "humain" ? human.id : service.user.id,
        },
        data: { isBlocked: true },
      });

      const response = await request(app().getHttpServer())
        .get("/users/me")
        .set(credentials(service.token, human))
        .expect(403);
      expect(response.body).toMatchObject({ blocked: true });
    },
  );

  it.each(["expiré", "révoqué", "inconnu"])(
    "refuse un jeton tiers %s même avec un JWT humain valide",
    async (invalidState) => {
      const token =
        invalidState === "inconnu"
          ? { password: `unknown-token-${randomUUID()}` }
          : await createToken(readerService.user, {
              status:
                invalidState === "révoqué"
                  ? TokenStatus.revoked
                  : TokenStatus.active,
              expiresAt: new Date(
                Date.now() + (invalidState === "expiré" ? -60_000 : 60_000),
              ),
            });

      await request(app().getHttpServer())
        .get("/users/me")
        .set(credentials(token, admin))
        .expect(401);
    },
  );

  it.each([
    ["faible", { auth_mode: "PASSWORD" }],
    ["inconnu", {}],
  ])(
    "refuse un niveau SSO %s malgré le jeton tiers",
    async (_label, claims) => {
      const response = await request(app().getHttpServer())
        .get("/users/me")
        .set(credentials(adminService.token, admin, claims))
        .expect(403);
      expect(response.body).toMatchObject({ strongAuthRequired: true });
      expect(response.body).not.toHaveProperty("id");
      expect(response.body).not.toHaveProperty("permissions");
    },
  );

  it.each(["humain", "service"])(
    "applique immédiatement une baisse du rôle %s aux mêmes identifiants d'authentification",
    async (loweredPrincipal) => {
      const human = await UserFaker.create({ role: Roles.ADMIN });
      const service = await createService(Roles.ADMIN);
      const target = await ApplicationFaker.create(admin);
      await linkActor(human, target.id, emptyActorTypeId);
      const headers = credentials(service.token, human);

      await request(app().getHttpServer())
        .patch(`/applications/${target.id}`)
        .set(headers)
        .send({ description: "Avant réduction des droits" })
        .expect(200);

      const loweredRole =
        loweredPrincipal === "humain" ? Roles.VISITOR : Roles.READER;
      await prisma.user.update({
        where: {
          id: loweredPrincipal === "humain" ? human.id : service.user.id,
        },
        data: { role: loweredRole },
      });
      const profile = await request(app().getHttpServer())
        .get("/users/me")
        .set(headers)
        .expect(200);
      expect(profile.body).toMatchObject({ id: human.id, role: loweredRole });

      const permissions = await request(app().getHttpServer())
        .get(`/applications/${target.id}/my-perms`)
        .set(headers)
        .expect(200);
      expect(permissions.body).not.toContain(Permission.AppWrite);
      await request(app().getHttpServer())
        .patch(`/applications/${target.id}`)
        .set(headers)
        .send({ description: "Après réduction des droits" })
        .expect(403);
      expect(
        await prisma.application.findUniqueOrThrow({
          where: { id: target.id },
        }),
      ).toMatchObject({ description: "Avant réduction des droits" });
      expect(
        await prisma.token.findUniqueOrThrow({
          where: { id: service.token.id },
        }),
      ).toMatchObject({ role: Roles.ADMIN });
    },
  );

  it("un périmètre de service limite les écritures même si l'humain est acteur des deux applications", async () => {
    const inside = await OrganizationFaker.create({
      path: `E2E/DELEGATED/${randomUUID()}/INSIDE`,
    });
    const outside = await OrganizationFaker.create({
      path: `E2E/DELEGATED/${randomUUID()}/OUTSIDE`,
    });
    const service = await createService(Roles.CONTRIBUTOR, {
      scopeOrganizationId: inside.id,
    });
    const human = await UserFaker.create({ role: Roles.VISITOR });
    const insideApp = await ApplicationFaker.create(admin);
    const outsideApp = await ApplicationFaker.create(admin);
    await linkActor(human, insideApp.id, writerActorTypeId, inside.id);
    await linkActor(human, outsideApp.id, writerActorTypeId, outside.id);
    const headers = credentials(service.token, human);

    const insidePermissions = await request(app().getHttpServer())
      .get(`/applications/${insideApp.id}/my-perms`)
      .set(headers)
      .expect(200);
    expect(insidePermissions.body).toContain(Permission.AppWrite);
    await request(app().getHttpServer())
      .patch(`/applications/${insideApp.id}`)
      .set(headers)
      .send({ description: "Écriture dans le périmètre du service" })
      .expect(200);

    const outsidePermissions = await request(app().getHttpServer())
      .get(`/applications/${outsideApp.id}/my-perms`)
      .set(headers)
      .expect(200);
    expect(outsidePermissions.body).not.toContain(Permission.AppWrite);
    await request(app().getHttpServer())
      .patch(`/applications/${outsideApp.id}`)
      .set(headers)
      .send({ description: "Tentative hors du périmètre du service" })
      .expect(403);
    expect(
      await prisma.application.findUniqueOrThrow({
        where: { id: outsideApp.id },
      }),
    ).toMatchObject({ description: outsideApp.description });
  });

  it.each(["humain", "service"])(
    "conserve le périmètre imbriqué le plus étroit lorsqu'il vient du compte %s",
    async (narrowerPrincipal) => {
      const parent = await OrganizationFaker.create({
        path: `E2E/DELEGATED/${randomUUID()}`,
      });
      const child = await OrganizationFaker.create({
        path: `${parent.path}/CHILD`,
      });
      const human = await UserFaker.create({ role: Roles.CONTRIBUTOR });
      await human.update({
        scopeOrganization: {
          connect: {
            id: narrowerPrincipal === "humain" ? child.id : parent.id,
          },
        },
      });
      const service = await createService(Roles.ADMIN, {
        scopeOrganizationId:
          narrowerPrincipal === "service" ? child.id : parent.id,
      });

      const profile = await request(app().getHttpServer())
        .get("/users/me")
        .set(credentials(service.token, human))
        .expect(200);
      expect(profile.body).toMatchObject({
        id: human.id,
        scopeOrganizationId: child.id,
        scopeOrganization: { id: child.id },
      });
    },
  );

  it("refuse des périmètres disjoints sans transformer leur intersection vide en accès global", async () => {
    const humanScope = await OrganizationFaker.create({
      path: `E2E/DELEGATED/${randomUUID()}/HUMAN`,
    });
    const serviceScope = await OrganizationFaker.create({
      path: `E2E/DELEGATED/${randomUUID()}/SERVICE`,
    });
    const human = await UserFaker.create({ role: Roles.ADMIN });
    await human.update({
      scopeOrganization: { connect: { id: humanScope.id } },
    });
    const service = await createService(Roles.ADMIN, {
      scopeOrganizationId: serviceScope.id,
    });

    await request(app().getHttpServer())
      .get("/users/me")
      .set(credentials(service.token, human))
      .expect(403);
  });

  it("interdit la création et la régénération de jetons même si l'humain et le service sont administrateurs", async () => {
    const headers = credentials(adminService.token, admin);
    for (const path of ["/tokens", "/tokens/personal"]) {
      const name = `forbidden-delegated-${randomUUID()}`;
      await request(app().getHttpServer())
        .post(path)
        .set(headers)
        .send({
          name,
          description: "Création interdite dans un contexte délégué",
          role: Roles.ADMIN,
          expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
        })
        .expect(403);
      expect(await prisma.token.count({ where: { name } })).toBe(0);
    }

    await request(app().getHttpServer())
      .post(`/tokens/${readerService.token.id}/regenerate`)
      .set(headers)
      .send({ expiresAt: new Date(Date.now() + 7_200_000).toISOString() })
      .expect(403);
    expect(
      await prisma.token.findUniqueOrThrow({
        where: { id: readerService.token.id },
      }),
    ).toMatchObject({
      hash: readerService.token.hash,
      expiresAt: readerService.token.expiresAt,
    });
  });

  it("interdit l'impersonation par route et par en-tête sans créer de session d'impersonation", async () => {
    const headers = credentials(adminService.token, admin);
    await request(app().getHttpServer())
      .post(`/users/${sam.id}/impersonate`)
      .set(headers)
      .expect(403);
    await request(app().getHttpServer())
      .get("/users/me")
      .set(headers)
      .set(IMPERSONATE_HEADER, sam.id)
      .expect(403);
    expect(
      await prisma.impersonationLog.count({
        where: { adminId: admin.id, targetId: sam.id },
      }),
    ).toBe(0);
  });

  it("préserve l'accès par un jeton personnel seul", async () => {
    const token = await createToken(writer, { createdById: writer.id });
    const response = await request(app().getHttpServer())
      .get("/users/me")
      .set(API_KEY_HEADER, token.password)
      .expect(200);
    expect(response.body).toMatchObject({
      id: writer.id,
      type: UserType.human,
      role: Roles.VISITOR,
    });
  });
});
