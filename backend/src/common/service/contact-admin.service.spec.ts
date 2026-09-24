import { PrismaService } from "src/prisma/prisma.service";
import { ContactAdminService } from "./contact-admin.service";

const scopedAdmin = (
  email: string,
  scopePath: string,
  lastPermissionChangeAt: Date | null = null,
) => ({
  email,
  lastPermissionChangeAt,
  scopeOrganization: { path: scopePath },
});

const setup = ({
  scopedAdmins = [] as ReturnType<typeof scopedAdmin>[],
  globalAdmin = null as { email: string } | null,
} = {}) => {
  const findMany = jest.fn().mockResolvedValue(scopedAdmins);
  const findFirst = jest.fn().mockResolvedValue(globalAdmin);
  const prisma = { user: { findMany, findFirst } };
  const service = new ContactAdminService(prisma as unknown as PrismaService);
  return { service, findMany, findFirst };
};

describe("ContactAdminService.resolveByOrganizationPaths", () => {
  it("renvoie l'admin scopé le plus proche, même si un admin plus haut est plus récent", async () => {
    const { service, findMany } = setup({
      scopedAdmins: [
        scopedAdmin("tutu@example.com", "TUTU", new Date("2026-09-01")),
        scopedAdmin("toto@example.com", "TUTU/TOTO", new Date("2026-01-01")),
      ],
    });

    const result = await service.resolveByOrganizationPaths(["TUTU/TOTO/TITI"]);

    expect(result).toEqual({ email: "toto@example.com", source: "local" });
    const [{ where }] = findMany.mock.calls[0];
    expect(where).toEqual({
      role: "ADMIN",
      scopeOrganizationId: { not: null },
    });
  });

  it("admin sur l'organisation exacte : prioritaire sur ses ancêtres", async () => {
    const { service } = setup({
      scopedAdmins: [
        scopedAdmin("toto@example.com", "TUTU/TOTO"),
        scopedAdmin("titi@example.com", "TUTU/TOTO/TITI"),
      ],
    });

    const result = await service.resolveByOrganizationPaths(["TUTU/TOTO/TITI"]);

    expect(result.email).toBe("titi@example.com");
  });

  it("seul un admin racine couvre l'organisation : c'est lui", async () => {
    const { service } = setup({
      scopedAdmins: [scopedAdmin("tutu@example.com", "TUTU")],
    });

    const result = await service.resolveByOrganizationPaths(["TUTU/TOTO/TITI"]);

    expect(result).toEqual({ email: "tutu@example.com", source: "local" });
  });

  it("ignore les `/` de bord et la casse des paths", async () => {
    const { service } = setup({
      scopedAdmins: [scopedAdmin("toto@example.com", "/tutu/toto/")],
    });

    const result = await service.resolveByOrganizationPaths(["TUTU/TOTO/TITI"]);

    expect(result.email).toBe("toto@example.com");
  });

  it("n'accepte que des ancêtres ancrés au séparateur (ni frère, ni préfixe nu, ni enfant)", async () => {
    const { service } = setup({
      scopedAdmins: [
        scopedAdmin("prefix@example.com", "TUTU/TOT"),
        scopedAdmin("sibling@example.com", "TUTU/TATA"),
        scopedAdmin("child@example.com", "TUTU/TOTO/TITI/TETE"),
      ],
      globalAdmin: { email: "global@example.com" },
    });

    const result = await service.resolveByOrganizationPaths(["TUTU/TOTO/TITI"]);

    expect(result).toEqual({ email: "global@example.com", source: "global" });
  });

  it("à proximité égale : le plus récent, les dates nulles en dernier", async () => {
    const { service } = setup({
      scopedAdmins: [
        scopedAdmin("never@example.com", "TUTU/TOTO", null),
        scopedAdmin("old@example.com", "TUTU/TOTO", new Date("2025-01-01")),
        scopedAdmin("recent@example.com", "TUTU/TOTO", new Date("2026-01-01")),
      ],
    });

    const result = await service.resolveByOrganizationPaths(["TUTU/TOTO"]);

    expect(result.email).toBe("recent@example.com");
  });

  it("plusieurs organisations : l'admin le plus proche de l'une d'elles", async () => {
    const { service } = setup({
      scopedAdmins: [
        scopedAdmin("mi@example.com", "MI"),
        scopedAdmin("sg@example.com", "MI/DNUM/SG"),
      ],
    });

    const result = await service.resolveByOrganizationPaths([
      "/MI/AUTRE",
      "/MI/DNUM/SG/BUREAU",
    ]);

    expect(result.email).toBe("sg@example.com");
  });

  it("excludeUserId : exclut l'appelant des recherches locale et globale", async () => {
    const { service, findMany, findFirst } = setup({
      globalAdmin: { email: "global@example.com" },
    });

    await service.resolveByOrganizationPaths(["TUTU"], {
      excludeUserId: "me",
    });

    expect(findMany.mock.calls[0][0].where.id).toEqual({ not: "me" });
    expect(findFirst.mock.calls[0][0].where).toEqual({
      role: "ADMIN",
      scopeOrganizationId: null,
      id: { not: "me" },
    });
  });

  it("aucun admin local : bascule sur l'admin global le plus récent", async () => {
    const { service, findFirst } = setup({
      globalAdmin: { email: "global-admin@example.com" },
    });

    const result = await service.resolveByOrganizationPaths(["/MI/DNUM/SG"]);

    expect(result).toEqual({
      email: "global-admin@example.com",
      source: "global",
    });
    const [{ where, orderBy }] = findFirst.mock.calls[0];
    expect(where).toEqual({ role: "ADMIN", scopeOrganizationId: null });
    expect(orderBy).toEqual({
      lastPermissionChangeAt: { sort: "desc", nulls: "last" },
    });
  });

  it("aucune organisation : ne cherche pas d'admin local et va directement à l'admin global", async () => {
    const { service, findMany } = setup({
      globalAdmin: { email: "global-admin@example.com" },
    });

    const result = await service.resolveByOrganizationPaths([]);

    expect(result).toEqual({
      email: "global-admin@example.com",
      source: "global",
    });
    expect(findMany).not.toHaveBeenCalled();
  });

  it("aucun admin en base : retombe sur l'adresse support statique", async () => {
    const { service } = setup();

    const result = await service.resolveByOrganizationPaths([]);

    expect(result).toEqual({
      email: "support-referentiel-applications@interieur.gouv.fr",
      source: "support",
    });
  });
});
