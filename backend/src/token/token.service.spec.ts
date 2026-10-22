import {
  Permission,
  Prisma,
  Roles,
  ServiceTokenMode,
  UserType,
} from "@prisma/client";
import { API_TOKEN, SERVICE_TOKEN_MODE } from "./domain/token.entity";
import { requestContext } from "src/common/request-context";
import { StepDownException } from "src/auth-level/step-down.exception";
import { DELEGATED_AUTH } from "src/permissions/delegated-auth";
import { IMPERSONATION_AUTH } from "src/permissions/impersonation-auth";
import type { Requestor } from "src/user/entities/user.entity";
import { TokenStatus } from "./domain/token-status.entity";
import { TokenService } from "./token.service";

describe("TokenService — impersonation plafonnée (#2925)", () => {
  const requestor = {
    id: "target-1",
    role: Roles.CONTRIBUTOR,
    type: UserType.human,
    additionalPermissions: [],
    [IMPERSONATION_AUTH]: {},
  } as unknown as Requestor;
  const prisma = {
    token: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const checkPermissions = { can: jest.fn().mockResolvedValue(true) };
  const service = new TokenService(
    prisma as never,
    checkPermissions as never,
    {} as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it.each([true, false])(
    "refuse de créer un secret durable (personal=%s)",
    async (personal) => {
      await expect(
        service.create(requestor, personal, {
          name: "synthetic-token",
          description: "synthetic",
          role: Roles.CONTRIBUTOR,
          expiresAt: new Date(Date.now() + 60_000),
        }),
      ).rejects.toMatchObject({ status: 403 });
      expect(checkPermissions.can).not.toHaveBeenCalled();
      expect(prisma.token.findMany).not.toHaveBeenCalled();
      expect(prisma.token.create).not.toHaveBeenCalled();
    },
  );

  it("refuse la régénération avant toute lecture ou mutation du secret", async () => {
    await expect(
      service.regenerate(requestor, "token-1", new Date(Date.now() + 60_000)),
    ).rejects.toMatchObject({ status: 403 });
    expect(checkPermissions.can).not.toHaveBeenCalled();
    expect(prisma.token.findUnique).not.toHaveBeenCalled();
    expect(prisma.token.update).not.toHaveBeenCalled();
  });
});

// #2504 : le plafonnement du rôle par le jeton doit aussi s'appliquer aux permissions déléguées
// (`additionalPermissions`) du compte impersonné.
describe("TokenService.findUserByToken — plafonnement", () => {
  const findUnique = jest.fn();
  const prisma = {
    token: { findUnique, update: jest.fn(), updateMany: jest.fn() },
  };
  const service = new TokenService(prisma as never, {} as never, {} as never);

  function tokenRow(tokenRole: Roles, userRole: Roles) {
    return {
      id: "token-1",
      name: "Mon token",
      role: tokenRole,
      serviceMode: ServiceTokenMode.machine,
      status: TokenStatus.active,
      expiresAt: new Date(Date.now() + 60_000),
      createdBy: { id: "creator" },
      userImpersonate: {
        id: "bot-1",
        role: userRole,
        additionalPermissions: [Permission.DataExport],
        scopeOrganization: null,
      },
    };
  }

  beforeEach(() => jest.clearAllMocks());

  it("retire les permissions déléguées quand le rôle du jeton est plus faible que celui du compte", async () => {
    findUnique.mockResolvedValue(tokenRow(Roles.VISITOR, Roles.CONTRIBUTOR));
    const user = await service.findUserByToken("clear");
    expect(user?.role).toBe(Roles.VISITOR);
    expect(user?.additionalPermissions).toEqual([]);
  });

  it("conserve les permissions déléguées quand le jeton porte le même rôle", async () => {
    findUnique.mockResolvedValue(
      tokenRow(Roles.CONTRIBUTOR, Roles.CONTRIBUTOR),
    );
    const user = await service.findUserByToken("clear");
    expect(user?.role).toBe(Roles.CONTRIBUTOR);
    expect(user?.additionalPermissions).toEqual([Permission.DataExport]);
  });

  it("plafonne le rôle mais conserve les permissions si c'est le compte qui est plus faible", async () => {
    findUnique.mockResolvedValue(tokenRow(Roles.ADMIN, Roles.READER));
    const user = await service.findUserByToken("clear");
    expect(user?.role).toBe(Roles.READER);
    expect(user?.additionalPermissions).toEqual([Permission.DataExport]);
  });

  // #3021 : l'id et le nom servent au log `api_token_call`, sans sortir en JSON.
  it("remonte l'id et le nom du jeton", async () => {
    findUnique.mockResolvedValue(tokenRow(Roles.READER, Roles.READER));
    const user = await service.findUserByToken("clear");
    expect(user?.[API_TOKEN]).toEqual({ id: "token-1", name: "Mon token" });
    expect(JSON.stringify(user)).not.toContain("Mon token");
  });

  it("retourne null pour un jeton inconnu", async () => {
    findUnique.mockResolvedValue(null);
    expect(await service.findUserByToken("clear")).toBeNull();
  });

  it("borne le marquage expiré à l'état lu pour préserver régénération et révocation concurrentes", async () => {
    const expiredAt = new Date(Date.now() - 60_000);
    findUnique.mockResolvedValue({
      ...tokenRow(Roles.READER, Roles.READER),
      expiresAt: expiredAt,
    });
    // La ligne a été renouvelée ou révoquée entre lecture et mise à jour :
    // l'écriture conditionnelle ne trouve plus l'état observé.
    prisma.token.updateMany.mockResolvedValue({ count: 0 });
    expect(await service.findUserByToken("clear")).toBeNull();
    expect(prisma.token.updateMany).toHaveBeenCalledWith({
      where: {
        id: "token-1",
        status: TokenStatus.active,
        expiresAt: expiredAt,
      },
      data: { status: TokenStatus.expired, updatedAt: expect.any(Date) },
    });
    expect(prisma.token.update).not.toHaveBeenCalled();
  });

  it("ne marque pas une expiration en lecture seule", async () => {
    findUnique.mockResolvedValue({
      ...tokenRow(Roles.READER, Roles.READER),
      expiresAt: new Date(Date.now() - 60_000),
    });
    expect(
      await service.findUserByToken("clear", { readOnly: true }),
    ).toBeNull();
    expect(prisma.token.updateMany).not.toHaveBeenCalled();
    expect(prisma.token.update).not.toHaveBeenCalled();
  });

  it.each(Object.values(ServiceTokenMode))(
    "transmet uniquement le mode %s enregistré en base",
    async (serviceMode) => {
      const token = {
        ...tokenRow(Roles.READER, Roles.READER),
        serviceMode,
      };
      findUnique.mockImplementation(
        async ({ where }: { where: { hash: string } }) =>
          where.hash === service.generateHash("clear", serviceMode)
            ? token
            : null,
      );
      const user = await service.findUserByToken("clear");
      expect(user?.[SERVICE_TOKEN_MODE]).toBe(serviceMode);
      expect(JSON.stringify(user)).not.toContain("serviceMode");
    },
  );
});

// #1985 : un jeton personnel figerait le rôle rétrogradé (VISITOR à vie) ou, pire, contournerait
// durablement le contrôle du niveau d'authentification : refus explicite avant tout accès Prisma.
describe("TokenService.create — session rétrogradée (#1985)", () => {
  const prisma = { token: { findMany: jest.fn(), create: jest.fn() } };
  const checkPermissions = { can: jest.fn().mockResolvedValue(true) };
  const service = new TokenService(
    prisma as never,
    checkPermissions as never,
    {} as never,
  );
  const downgraded = {
    id: "user-1",
    role: Roles.VISITOR,
    additionalPermissions: [],
    permissions: [],
    authLevel: { level: "weak", downgraded: true, reason: "weak-method" },
  } as unknown as Requestor;

  it("refuse la création d'un jeton personnel", async () => {
    await expect(
      service.create(downgraded, true, {
        name: "perso",
        expiresAt: new Date(Date.now() + 60_000),
        role: Roles.VISITOR,
      } as never),
    ).rejects.toMatchObject({ reason: "personal-token" });
    expect(checkPermissions.can).not.toHaveBeenCalled();
    expect(prisma.token.create).not.toHaveBeenCalled();
  });

  it("laisse la création d'un jeton de service au contrôle GlobalAdminManage habituel", async () => {
    checkPermissions.can.mockResolvedValueOnce(false);
    const error: unknown = await service
      .create(downgraded, false, {
        name: "service",
        expiresAt: new Date(Date.now() + 60_000),
        role: Roles.VISITOR,
      } as never)
      .catch((e: unknown) => e);
    expect(error).not.toBeInstanceOf(StepDownException);
    expect((error as Error).message).toBe(
      "Only admins can create service tokens",
    );
    expect(prisma.token.create).not.toHaveBeenCalled();
  });
});

describe("TokenService.create — un compte de service ne distribue pas de tokens (#1988)", () => {
  it.each([true, false])(
    "refuse avant tout contrôle de permission ou accès Prisma, même pour un bot ADMIN (personal=%s)",
    async (personal) => {
      const prisma = { token: { findMany: jest.fn(), create: jest.fn() } };
      const checkPermissions = { can: jest.fn().mockResolvedValue(true) };
      const service = new TokenService(
        prisma as never,
        checkPermissions as never,
        {} as never,
      );
      const bot = {
        id: "service-id",
        type: UserType.bot,
        role: Roles.ADMIN,
        permissions: [],
        additionalPermissions: [],
      } as Requestor;
      await expect(
        service.create(bot, personal, {
          name: "secret dérivé",
          description: "contournement /tokens/personal",
          expiresAt: new Date(Date.now() + 60_000),
          role: Roles.ADMIN,
        }),
      ).rejects.toMatchObject({ status: 403 });
      expect(checkPermissions.can).not.toHaveBeenCalled();
      expect(prisma.token.findMany).not.toHaveBeenCalled();
      expect(prisma.token.create).not.toHaveBeenCalled();
    },
  );
});

describe("TokenService.regenerate — échéance et statut (#2926)", () => {
  const now = new Date("2026-10-22T12:00:00.000Z");
  const expiresAt = new Date("2027-01-22T12:00:00.000Z");
  const requestor = {
    id: "admin-1",
    role: Roles.ADMIN,
    type: UserType.human,
    permissions: [Permission.GlobalAdminManage],
    additionalPermissions: [],
  } as Requestor;
  const prisma = { token: { findUnique: jest.fn(), update: jest.fn() } };
  const checkPermissions = { can: jest.fn() };
  const service = new TokenService(
    prisma as never,
    checkPermissions as never,
    {} as never,
  );

  function tokenRow(status: string = TokenStatus.active) {
    return {
      id: "token-1",
      name: "service",
      role: Roles.READER,
      status,
      serviceMode: ServiceTokenMode.machine,
      expiresAt: new Date(
        status === TokenStatus.expired
          ? "2026-10-21T12:00:00.000Z"
          : "2026-11-01T12:00:00.000Z",
      ),
      createdAt: now,
      updatedAt: now,
      createdBy: {
        id: requestor.id,
        email: "admin@example.test",
        type: UserType.human,
      },
      userImpersonate: {
        id: "bot-1",
        email: "service@example.test",
        type: UserType.bot,
        scopeOrganization: null,
      },
    };
  }

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    jest.clearAllMocks();
    checkPermissions.can.mockResolvedValue(true);
    prisma.token.findUnique.mockResolvedValue(tokenRow());
    prisma.token.update.mockImplementation(
      async ({ data }: { data: { expiresAt: Date; status: string } }) => ({
        ...tokenRow(),
        ...data,
      }),
    );
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it.each([
    ["invalide", new Date(Number.NaN)],
    ["passée", new Date(now.getTime() - 1)],
    ["présente", now],
    ["supérieure à un an", new Date("2027-10-22T12:00:00.001Z")],
  ])(
    "refuse une date %s avant toute génération de secret ou mutation",
    async (_description, invalidDate) => {
      const generateHash = jest.spyOn(service, "generateHash");
      await expect(
        service.regenerate(requestor, "token-1", invalidDate),
      ).rejects.toMatchObject({ status: 400 });
      expect(generateHash).not.toHaveBeenCalled();
      expect(prisma.token.update).not.toHaveBeenCalled();
    },
  );

  it.each([TokenStatus.active, TokenStatus.expired])(
    "renouvelle atomiquement un jeton %s avec un statut actif",
    async (status) => {
      prisma.token.findUnique.mockResolvedValue(tokenRow(status));
      const result = await service.regenerate(requestor, "token-1", expiresAt);
      expect(result.status).toBe(TokenStatus.active);
      expect(result.expiresAt).toBe(expiresAt.toISOString());
      expect(result.password).toHaveLength(48);
      expect(prisma.token.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "token-1", status: { not: TokenStatus.revoked } },
          data: {
            hash: service.generateHash(result.password),
            expiresAt,
            updatedAt: now,
            status: TokenStatus.active,
          },
        }),
      );
    },
  );

  it("conserve le préfixe de hash d'un jeton délégué", async () => {
    prisma.token.findUnique.mockResolvedValue({
      ...tokenRow(),
      serviceMode: ServiceTokenMode.delegated,
    });
    const result = await service.regenerate(requestor, "token-1", expiresAt);
    expect(prisma.token.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          hash: service.generateHash(
            result.password,
            ServiceTokenMode.delegated,
          ),
        }),
      }),
    );
  });

  it("refuse un jeton déjà révoqué sans le modifier", async () => {
    prisma.token.findUnique.mockResolvedValue(tokenRow(TokenStatus.revoked));
    await expect(
      service.regenerate(requestor, "token-1", expiresAt),
    ).rejects.toMatchObject({ status: 404 });
    expect(prisma.token.update).not.toHaveBeenCalled();
  });

  it("ne réactive pas un jeton révoqué entre lecture et écriture et n'émet aucun secret", async () => {
    prisma.token.update.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("No record found", {
        code: "P2025",
        clientVersion: "6.19.3",
      }),
    );
    await expect(
      service.regenerate(requestor, "token-1", expiresAt),
    ).rejects.toMatchObject({ status: 404 });
    expect(prisma.token.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "token-1", status: { not: TokenStatus.revoked } },
      }),
    );
  });

  it("propage une erreur de stockage sans émettre de secret", async () => {
    const failure = new Error("database unavailable");
    prisma.token.update.mockRejectedValueOnce(failure);
    await expect(
      service.regenerate(requestor, "token-1", expiresAt),
    ).rejects.toBe(failure);
  });

  it("refuse une impersonation globale identifiée par le contexte de requête", async () => {
    await requestContext.run({ impersonatorId: "real-admin" }, async () => {
      await expect(
        service.regenerate(requestor, "token-1", expiresAt),
      ).rejects.toMatchObject({ status: 403 });
    });
    expect(checkPermissions.can).not.toHaveBeenCalled();
    expect(prisma.token.findUnique).not.toHaveBeenCalled();
    expect(prisma.token.update).not.toHaveBeenCalled();
  });

  it.each([
    { ...requestor, type: UserType.bot },
    {
      ...requestor,
      [DELEGATED_AUTH]: { human: requestor, service: requestor },
    },
    {
      ...requestor,
      [IMPERSONATION_AUTH]: { admin: requestor, target: requestor },
    },
  ])(
    "refuse un principal non humain direct avant tout accès Prisma",
    async (principal) => {
      await expect(
        service.regenerate(principal, "token-1", expiresAt),
      ).rejects.toMatchObject({ status: 403 });
      expect(prisma.token.findUnique).not.toHaveBeenCalled();
      expect(prisma.token.update).not.toHaveBeenCalled();
    },
  );
});
