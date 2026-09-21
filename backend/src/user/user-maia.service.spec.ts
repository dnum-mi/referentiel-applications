import { Test } from "@nestjs/testing";
import { Roles } from "@prisma/client";
import { EmailService } from "src/email/email.service";
import { LoggerService } from "src/logger/logger.service";
import { NotificationService } from "src/notification/notification.service";
import { OrganizationMaiaReferencesService } from "src/organization-maia-references/organization-maia-references.service";
import { PrismaService } from "src/prisma/prisma.service";
import { MaiaUnavailableException } from "./errors/maia-unavailable.exception";
import { ScopedPermissionService } from "./scope-permission/scoped-permission.service";
import { UserPermissionLogService } from "./user-permission-log.service";
import { UserService } from "./user.service";
import { getOrganizationPathFromMaia } from "./utils/maia.tools";

jest.mock("./utils/maia.tools");
jest.mock(
  "src/organization-maia-references/organization-maia-references.service",
  () => ({
    OrganizationMaiaReferencesService: jest.fn(),
  }),
);
jest.mock("src/email/email.service", () => ({ EmailService: jest.fn() }));
jest.mock("./user-permission-log.service", () => ({
  UserPermissionLogService: jest.fn(),
}));

describe("UserService — indisponibilité MAIA", () => {
  const lookup = jest.mocked(getOrganizationPathFromMaia);

  async function setup() {
    const user = {
      id: "new-user",
      email: "new@example.com",
      role: Roles.VISITOR,
      organization: null,
    };
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(user),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };
    const references = {
      findOrganizationByMaiaRef: jest.fn().mockResolvedValue({ id: "org-1" }),
    };
    const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
    const permissions = { log: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: prisma },
        { provide: UserPermissionLogService, useValue: permissions },
        { provide: OrganizationMaiaReferencesService, useValue: references },
        { provide: ScopedPermissionService, useValue: {} },
        { provide: LoggerService, useValue: logger },
        { provide: EmailService, useValue: {} },
        { provide: NotificationService, useValue: {} },
      ],
    }).compile();
    return {
      service: module.get(UserService),
      prisma,
      references,
      logger,
      permissions,
      user,
    };
  }

  beforeEach(() => jest.resetAllMocks());

  it.each(["network", "timeout", "http", "response", "configuration"] as const)(
    "crée un nouveau visiteur sans organisation malgré une panne %s",
    async (reason) => {
      const { service, prisma, logger, permissions, user } = await setup();
      lookup.mockRejectedValue(new MaiaUnavailableException(reason));
      await expect(
        service.findOrCreateByEmail("NEW@example.com"),
      ).resolves.toEqual(user);
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            email: "new@example.com",
            role: Roles.VISITOR,
          },
        }),
      );
      expect(permissions.log).toHaveBeenCalledWith(user);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(reason));
    },
  );

  it("conserve l'organisation quand MAIA répond", async () => {
    const { service, prisma, references } = await setup();
    lookup.mockResolvedValue("ORG/SERVICE");
    await service.createUser("new@example.com");
    expect(references.findOrganizationByMaiaRef).toHaveBeenCalledWith(
      "ORG/SERVICE",
    );
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          email: "new@example.com",
          role: Roles.VISITOR,
          organizationId: "org-1",
        },
      }),
    );
  });

  it("ne consulte pas MAIA pour un utilisateur déjà connu", async () => {
    const { service, prisma, user } = await setup();
    prisma.user.findFirst.mockResolvedValue(user);
    await expect(service.findOrCreateByEmail(user.email)).resolves.toEqual(
      user,
    );
    expect(lookup).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("ne masque pas une erreur de création d'organisation", async () => {
    const { service, prisma, references } = await setup();
    lookup.mockResolvedValue("ORG/SERVICE");
    const failure = new Error("database unavailable");
    references.findOrganizationByMaiaRef.mockRejectedValue(failure);
    await expect(service.createUser("new@example.com")).rejects.toBe(failure);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("poursuit le batch après une panne et décompte les résultats", async () => {
    const { service, prisma, logger } = await setup();
    prisma.user.findMany.mockResolvedValue([
      { id: "failed", email: "failed@example.com" },
      { id: "synced", email: "synced@example.com" },
      { id: "missing", email: "missing@example.com" },
    ]);
    lookup
      .mockRejectedValueOnce(new MaiaUnavailableException("network"))
      .mockResolvedValueOnce("ORG/SERVICE")
      .mockResolvedValueOnce(null);
    const summary = { processed: 3, synced: 1, notFound: 1, failed: 1 };
    await expect(service.syncOrganizationsFromMaia({})).resolves.toEqual(
      summary,
    );
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: null } }),
    );
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "synced" },
      data: { organizationId: "org-1" },
    });
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("failed"),
      expect.any(MaiaUnavailableException),
    );
    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining(JSON.stringify(summary)),
    );
  });
});
