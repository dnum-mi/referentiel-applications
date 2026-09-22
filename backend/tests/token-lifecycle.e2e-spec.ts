import { createHash, randomUUID } from "node:crypto";
import { Roles, ServiceTokenMode, TokenStatus, UserType } from "@prisma/client";
import request from "supertest";
import type { ExposedTokenDto } from "src/token/dto/token.dto";
import { getPrismaClient } from "./fakers/prisma";
import type { UserFakerReturnType } from "./fakers/user.faker";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

const API_KEY_HEADER = "x-refapp-token";

describe("Administration et révocation des jetons API (#1988)", () => {
  const app = setupTestSuite();
  const prisma = getPrismaClient();
  const suffix = Date.now();
  let tokenSequence = 0;

  let admin: UserFakerReturnType;
  let otherAdmin: UserFakerReturnType;

  beforeAll(async () => {
    admin = await UserFaker.create({ role: Roles.ADMIN });
    otherAdmin = await UserFaker.create({ role: Roles.ADMIN });
  });

  function tokenData() {
    tokenSequence += 1;
    return {
      name: `e2e-lifecycle-${suffix}-${tokenSequence}`,
      description: "Vérification du cycle de vie des jetons API",
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    };
  }

  async function createServiceToken(
    creator = admin,
    options: { serviceMode?: ServiceTokenMode; role?: Roles } = {},
  ) {
    const response = await request(app().getHttpServer())
      .post("/tokens")
      .set("Authorization", `Bearer ${getToken(creator)}`)
      .send({ ...tokenData(), role: Roles.READER, ...options })
      .expect(201);

    return response.body as ExposedTokenDto;
  }

  async function createPersonalToken(owner: UserFakerReturnType) {
    const response = await request(app().getHttpServer())
      .post("/tokens/personal")
      .set("Authorization", `Bearer ${getToken(owner)}`)
      // Le rôle demandé ne doit jamais augmenter celui du propriétaire.
      .send({ ...tokenData(), role: Roles.ADMIN })
      .expect(201);

    expect(response.body).toMatchObject({
      kind: "personal",
      role: owner.role,
      serviceMode: ServiceTokenMode.machine,
      userImpersonate: { id: owner.id },
    });
    return response.body as ExposedTokenDto;
  }

  async function expectLegacyLookupCompatibility(
    token: ExposedTokenDto,
    serviceMode: ServiceTokenMode,
  ) {
    expect(token.serviceMode).toBe(serviceMode);
    // Les anciens backends ne connaissent que SHA512(secret). Ils doivent
    // continuer à reconnaître les machines et refuser les tokens délégués.
    const legacyToken = await prisma.token.findUnique({
      where: {
        hash: createHash("sha512").update(token.password).digest("hex"),
      },
      select: { id: true },
    });
    expect(legacyToken).toEqual(
      serviceMode === ServiceTokenMode.machine ? { id: token.id } : null,
    );
  }

  it.each(
    [Roles.VISITOR, Roles.READER, Roles.CONTRIBUTOR].flatMap((role) =>
      Object.values(ServiceTokenMode).map((serviceMode) => ({
        role,
        serviceMode,
      })),
    ),
  )(
    "refuse la délivrance d'un jeton $serviceMode à un $role",
    async ({ role, serviceMode }) => {
      const user = await UserFaker.create({ role });
      const data = { ...tokenData(), role: Roles.ADMIN, serviceMode };

      await request(app().getHttpServer())
        .post("/tokens")
        .set("Authorization", `Bearer ${getToken(user)}`)
        .send(data)
        .expect(403);

      expect(
        await prisma.token.count({ where: { createdById: user.id } }),
      ).toBe(0);
    },
  );

  it("conserve le mode machine par défaut pour les créations API sans mode explicite", async () => {
    const creator = await UserFaker.create({ role: Roles.ADMIN });
    const token = await createServiceToken(creator);
    expect(token).toMatchObject({
      kind: "service",
      serviceMode: ServiceTokenMode.machine,
    });
    const storedToken = await prisma.token.findUniqueOrThrow({
      where: { id: token.id },
    });
    expect(storedToken.serviceMode).toBe(ServiceTokenMode.machine);

    const profile = await request(app().getHttpServer())
      .get("/users/me")
      .set(API_KEY_HEADER, token.password)
      .expect(200);
    expect(profile.body).toMatchObject({
      id: storedToken.userIdImpersonate,
      type: UserType.bot,
      role: Roles.READER,
    });
  });

  it("refuse un mode inconnu avant de créer un jeton ou un compte de service", async () => {
    const data = {
      ...tokenData(),
      role: Roles.READER,
      serviceMode: "automatic",
    };
    await request(app().getHttpServer())
      .post("/tokens")
      .set("Authorization", `Bearer ${getToken(admin)}`)
      .send(data)
      .expect(400);

    expect(await prisma.token.count({ where: { name: data.name } })).toBe(0);
    expect(
      await prisma.user.count({
        where: { email: { startsWith: `${data.name}-` }, type: UserType.bot },
      }),
    ).toBe(0);
  });

  it.each(Object.values(ServiceTokenMode))(
    "refuse l'injection du mode %s lors de la création d'un jeton personnel",
    async (serviceMode) => {
      const owner = await UserFaker.create({ role: Roles.CONTRIBUTOR });
      const data = { ...tokenData(), serviceMode };
      await request(app().getHttpServer())
        .post("/tokens/personal")
        .set("Authorization", `Bearer ${getToken(owner)}`)
        .send(data)
        .expect(400);

      expect(
        await prisma.token.count({ where: { createdById: owner.id } }),
      ).toBe(0);
    },
  );

  it("permet à un autre administrateur de révoquer un jeton de service et refuse immédiatement sa réutilisation", async () => {
    const token = await createServiceToken();
    expect(token).toMatchObject({
      kind: "service",
      role: Roles.READER,
      createdBy: { id: admin.id },
    });
    expect(token.password).toEqual(expect.any(String));
    const storedToken = await prisma.token.findUniqueOrThrow({
      where: { id: token.id },
      include: { userImpersonate: true },
    });
    expect(storedToken.userImpersonate.type).toBe(UserType.bot);
    expect(storedToken.userImpersonate.id).not.toBe(admin.id);

    await request(app().getHttpServer())
      .get("/users/me")
      .set("Authorization", `Bearer ${getToken(admin)}`)
      .set(API_KEY_HEADER, token.password)
      .expect(200);

    await request(app().getHttpServer())
      .delete(`/tokens/${token.id}`)
      .set("Authorization", `Bearer ${getToken(otherAdmin)}`)
      .expect(204);

    expect(
      await prisma.token.findUniqueOrThrow({ where: { id: token.id } }),
    ).toMatchObject({ status: TokenStatus.revoked });

    // Un JWT humain valide ne doit pas masquer la révocation du jeton tiers.
    await request(app().getHttpServer())
      .get("/users/me")
      .set("Authorization", `Bearer ${getToken(admin)}`)
      .set(API_KEY_HEADER, token.password)
      .expect(401);
  });

  it("refuse la révocation d'un jeton de service à son créateur devenu non administrateur, y compris par la route personnelle", async () => {
    const formerAdmin = await UserFaker.create({ role: Roles.ADMIN });
    const token = await createServiceToken(formerAdmin);
    await formerAdmin.update({ role: Roles.CONTRIBUTOR });

    for (const path of [
      `/tokens/${token.id}`,
      `/tokens/personal/${token.id}`,
    ]) {
      await request(app().getHttpServer())
        .delete(path)
        .set("Authorization", `Bearer ${getToken(formerAdmin)}`)
        .expect(404);
    }

    expect(
      await prisma.token.findUniqueOrThrow({ where: { id: token.id } }),
    ).toMatchObject({ status: TokenStatus.active });
  });

  it.each(Object.values(ServiceTokenMode))(
    "réserve la régénération d'un jeton %s aux administrateurs, conserve son mode et invalide son ancienne valeur",
    async (serviceMode) => {
      const token = await createServiceToken(admin, { serviceMode });
      await expectLegacyLookupCompatibility(token, serviceMode);
      const storedToken = await prisma.token.findUniqueOrThrow({
        where: { id: token.id },
      });
      const nonAdmin = await UserFaker.create({ role: Roles.READER });
      const expiresAt = new Date(Date.now() + 7_200_000).toISOString();

      await request(app().getHttpServer())
        .post(`/tokens/${token.id}/regenerate`)
        .set("Authorization", `Bearer ${getToken(nonAdmin)}`)
        .send({ expiresAt })
        .expect(403);

      await request(app().getHttpServer())
        .post(`/tokens/${token.id}/regenerate`)
        .set("Authorization", `Bearer ${getToken(otherAdmin)}`)
        .send({
          expiresAt,
          serviceMode:
            serviceMode === ServiceTokenMode.machine
              ? ServiceTokenMode.delegated
              : ServiceTokenMode.machine,
        })
        .expect(400);
      expect(
        await prisma.token.findUniqueOrThrow({ where: { id: token.id } }),
      ).toMatchObject({
        hash: storedToken.hash,
        expiresAt: storedToken.expiresAt,
        serviceMode,
      });

      const regenerated = await request(app().getHttpServer())
        .post(`/tokens/${token.id}/regenerate`)
        .set("Authorization", `Bearer ${getToken(otherAdmin)}`)
        .send({ expiresAt })
        .expect(201);
      const newToken = regenerated.body as ExposedTokenDto;
      expect(newToken.id).toBe(token.id);
      expect(newToken.password).not.toBe(token.password);
      await expectLegacyLookupCompatibility(newToken, serviceMode);
      expect(
        await prisma.token.findUniqueOrThrow({ where: { id: token.id } }),
      ).toMatchObject({ serviceMode, expiresAt: new Date(expiresAt) });

      await request(app().getHttpServer())
        .get("/users/me")
        .set("Authorization", `Bearer ${getToken(admin)}`)
        .set(API_KEY_HEADER, token.password)
        .expect(401);

      await request(app().getHttpServer())
        .get("/users/me")
        .set(API_KEY_HEADER, newToken.password)
        .expect(serviceMode === ServiceTokenMode.machine ? 200 : 401);

      await request(app().getHttpServer())
        .get("/users/me")
        .set("Authorization", `Bearer ${getToken(admin)}`)
        .set(API_KEY_HEADER, newToken.password)
        .expect(200);
    },
  );

  it("refuse en base la régénération d'un jeton délégué par un ancien backend sans altérer son accès", async () => {
    const creator = await UserFaker.create({ role: Roles.ADMIN });
    const token = await createServiceToken(creator, {
      serviceMode: ServiceTokenMode.delegated,
    });
    const storedToken = await prisma.token.findUniqueOrThrow({
      where: { id: token.id },
    });
    const legacyPassword = `legacy-regeneration-${randomUUID()}`;
    const legacyHash = createHash("sha512")
      .update(legacyPassword)
      .digest("hex");

    // Un ancien pod ne transmet pas serviceMode lors d'une régénération.
    // La contrainte doit refuser toute l'écriture, y compris l'expiration.
    await expect(
      prisma.token.update({
        where: { id: token.id },
        data: {
          hash: legacyHash,
          expiresAt: new Date(storedToken.expiresAt.getTime() + 3_600_000),
        },
      }),
    ).rejects.toThrow("Token_service_mode_hash_check");
    expect(
      await prisma.token.findUniqueOrThrow({ where: { id: token.id } }),
    ).toMatchObject({
      hash: storedToken.hash,
      expiresAt: storedToken.expiresAt,
      serviceMode: ServiceTokenMode.delegated,
    });
    expect(
      await prisma.token.count({
        where: { hash: { in: [legacyHash, `delegated:${legacyHash}`] } },
      }),
    ).toBe(0);

    await request(app().getHttpServer())
      .get("/users/me")
      .set(API_KEY_HEADER, legacyPassword)
      .set("Authorization", `Bearer ${getToken(creator)}`)
      .expect(401);
    await request(app().getHttpServer())
      .get("/users/me")
      .set(API_KEY_HEADER, token.password)
      .expect(401);
    const profile = await request(app().getHttpServer())
      .get("/users/me")
      .set(API_KEY_HEADER, token.password)
      .set("Authorization", `Bearer ${getToken(creator)}`)
      .expect(200);
    expect(profile.body).toMatchObject({
      id: creator.id,
      type: UserType.human,
      role: Roles.READER,
    });
  });

  it("refuse de délivrer un jeton personnel à travers un jeton de service", async () => {
    const token = await createServiceToken();
    const data = tokenData();

    await request(app().getHttpServer())
      .post("/tokens/personal")
      .set("Authorization", `Bearer ${getToken(admin)}`)
      .set(API_KEY_HEADER, token.password)
      .send(data)
      .expect(403);

    expect(await prisma.token.count({ where: { name: data.name } })).toBe(0);
  });

  it.each([false, true])(
    "un jeton machine ADMIN ne peut créer ou régénérer de jetons, avec JWT humain : %s",
    async (withHumanJwt) => {
      const creator = await UserFaker.create({ role: Roles.ADMIN });
      const token = await createServiceToken(creator, {
        serviceMode: ServiceTokenMode.machine,
        role: Roles.ADMIN,
      });
      const storedToken = await prisma.token.findUniqueOrThrow({
        where: { id: token.id },
      });
      const headers: Record<string, string> = {
        [API_KEY_HEADER]: token.password,
      };
      if (withHumanJwt) {
        headers.Authorization = `Bearer ${getToken(creator)}`;
      }
      for (const path of ["/tokens", "/tokens/personal"]) {
        const data = { ...tokenData(), role: Roles.ADMIN };
        await request(app().getHttpServer())
          .post(path)
          .set(headers)
          .send(data)
          .expect(403);
        expect(await prisma.token.count({ where: { name: data.name } })).toBe(
          0,
        );
        expect(
          await prisma.user.count({
            where: {
              email: { startsWith: `${data.name}-` },
              type: UserType.bot,
            },
          }),
        ).toBe(0);
      }

      await request(app().getHttpServer())
        .post(`/tokens/${token.id}/regenerate`)
        .set(headers)
        .send({ expiresAt: new Date(Date.now() + 7_200_000).toISOString() })
        .expect(403);
      expect(
        await prisma.token.findUniqueOrThrow({ where: { id: token.id } }),
      ).toMatchObject({
        hash: storedToken.hash,
        expiresAt: storedToken.expiresAt,
        serviceMode: ServiceTokenMode.machine,
      });
    },
  );

  it.each(["/tokens", "/tokens/personal"])(
    "réserve la révocation personnelle au propriétaire ou à un administrateur via %s",
    async (path) => {
      const owner = await UserFaker.create({ role: Roles.CONTRIBUTOR });
      const stranger = await UserFaker.create({ role: Roles.CONTRIBUTOR });
      const token = await createPersonalToken(owner);

      await request(app().getHttpServer())
        .delete(`${path}/${token.id}`)
        .set("Authorization", `Bearer ${getToken(stranger)}`)
        .expect(404);
      expect(
        await prisma.token.findUniqueOrThrow({ where: { id: token.id } }),
      ).toMatchObject({ status: TokenStatus.active });

      await request(app().getHttpServer())
        .delete(`${path}/${token.id}`)
        .set("Authorization", `Bearer ${getToken(owner)}`)
        .expect(204);
      expect(
        await prisma.token.findUniqueOrThrow({ where: { id: token.id } }),
      ).toMatchObject({ status: TokenStatus.revoked });

      const otherToken = await createPersonalToken(owner);
      await request(app().getHttpServer())
        .delete(`${path}/${otherToken.id}`)
        .set("Authorization", `Bearer ${getToken(otherAdmin)}`)
        .expect(204);
      expect(
        await prisma.token.findUniqueOrThrow({ where: { id: otherToken.id } }),
      ).toMatchObject({ status: TokenStatus.revoked });
    },
  );
});
