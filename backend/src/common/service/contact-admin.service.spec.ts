import { PrismaService } from "src/prisma/prisma.service";
import { ContactAdminService } from "./contact-admin.service";

const setup = (findFirstUser: jest.Mock) => {
  const prisma = { user: { findFirst: findFirstUser } };
  return new ContactAdminService(prisma as unknown as PrismaService);
};

describe("ContactAdminService.resolveByOrganizationPaths", () => {
  it("renvoie l'admin local le plus récent dont le périmètre couvre l'organisation", async () => {
    const findFirstUser = jest
      .fn()
      .mockResolvedValue({ email: "local-admin@example.com" });

    const result = await setup(findFirstUser).resolveByOrganizationPaths([
      "/MI/DNUM/SG",
    ]);

    expect(result).toEqual({
      email: "local-admin@example.com",
      source: "local",
    });
    const [{ where, orderBy }] = findFirstUser.mock.calls[0];
    expect(where.role).toBe("ADMIN");
    expect(where.scopeOrganization.OR).toEqual(
      expect.arrayContaining([
        { path: { equals: "/MI", mode: "insensitive" } },
        { path: { equals: "/MI/DNUM", mode: "insensitive" } },
        { path: { equals: "/MI/DNUM/SG", mode: "insensitive" } },
      ]),
    );
    expect(orderBy).toEqual({
      lastPermissionChangeAt: { sort: "desc", nulls: "last" },
    });
  });

  it("aucun admin local : bascule sur l'admin global le plus récent", async () => {
    const findFirstUser = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ email: "global-admin@example.com" });

    const result = await setup(findFirstUser).resolveByOrganizationPaths([
      "/MI/DNUM/SG",
    ]);

    expect(result).toEqual({
      email: "global-admin@example.com",
      source: "global",
    });
    const [{ where }] = findFirstUser.mock.calls[1];
    expect(where).toEqual({ role: "ADMIN", scopeOrganizationId: null });
  });

  it("aucune organisation : ne cherche pas d'admin local et va directement à l'admin global", async () => {
    const findFirstUser = jest
      .fn()
      .mockResolvedValue({ email: "global-admin@example.com" });

    const result = await setup(findFirstUser).resolveByOrganizationPaths([]);

    expect(result).toEqual({
      email: "global-admin@example.com",
      source: "global",
    });
    expect(findFirstUser).toHaveBeenCalledTimes(1);
  });

  it("aucun admin en base : retombe sur l'adresse support statique", async () => {
    const findFirstUser = jest.fn().mockResolvedValue(null);

    const result = await setup(findFirstUser).resolveByOrganizationPaths([]);

    expect(result).toEqual({
      email: "support-referentiel-applications@interieur.gouv.fr",
      source: "support",
    });
  });
});
