import { Permission, Roles } from "@prisma/client";
import { TokenStatus } from "./domain/token-status.entity";
import { TokenService } from "./token.service";

// #2504 : le plafonnement du rôle par le jeton doit aussi s'appliquer aux permissions déléguées
// (`additionalPermissions`) du compte impersonné.
describe("TokenService.findUserByToken — plafonnement", () => {
  const findUnique = jest.fn();
  const prisma = { token: { findUnique, update: jest.fn() } };
  const service = new TokenService(prisma as never, {} as never, {} as never);

  function tokenRow(tokenRole: Roles, userRole: Roles) {
    return {
      id: "token-1",
      role: tokenRole,
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

  it("retourne null pour un jeton inconnu", async () => {
    findUnique.mockResolvedValue(null);
    expect(await service.findUserByToken("clear")).toBeNull();
  });
});
