import { AuthLevel } from "@prisma/client";
import type { PrismaService } from "src/prisma/prisma.service";
import { UserConnexionLogService } from "./user-connexion-log.service";

// `BaseService` entraîne à l'import tout le graphe des services (metadatas…) : hors sujet
// pour un test unitaire du seul `log()`.
jest.mock("src/common/base.service", () => ({
  BaseService: class BaseService {},
}));

describe("UserConnexionLogService.log (#1985)", () => {
  const createMany = jest.fn();
  const service = new UserConnexionLogService({
    userConnexionLog: { createMany },
  } as unknown as PrismaService);

  beforeEach(() => createMany.mockReset());

  it("écrit une ligne par utilisateur, jour et contexte, avec les valeurs brutes", async () => {
    createMany.mockResolvedValue({ count: 1 });

    const result = await service.log("user-1", {
      level: AuthLevel.weak,
      reason: "weak-method",
      claimValue: "PASSWORD",
      idp: "Passage2",
    });

    expect(result).toEqual({ created: true });
    expect(createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          userId: "user-1",
          authLevel: AuthLevel.weak,
          authMethod: "PASSWORD",
          authIdp: "Passage2",
          authSource: "token",
          authContextKey: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      ],
      skipDuplicates: true,
    });
    const { authTime } = createMany.mock.calls[0][0].data[0];
    expect(authTime.getUTCHours()).toBe(0);
  });

  it("signale une ligne déjà présente sans lever d'erreur", async () => {
    createMany.mockResolvedValue({ count: 0 });
    expect(await service.log("user-1")).toEqual({ created: false });
  });

  it("journalise `unknown` sans méthode quand rien n'a été évalué (mode off, jeton API)", async () => {
    createMany.mockResolvedValue({ count: 1 });
    await service.log("user-1");
    expect(createMany.mock.calls[0][0].data[0]).toMatchObject({
      authLevel: AuthLevel.unknown,
      authMethod: null,
      authIdp: null,
    });
  });
});
