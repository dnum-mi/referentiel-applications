import { Roles } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { Requestor } from "../entities/user.entity";
import { ScopePermissionsException } from "../errors/scope-permissions.exception";
import { ScopedPermissionService } from "./scoped-permission.service";

describe("ScopedPermissionService — assertCanAssignScopeToNewPrincipal", () => {
  function buildRequestor(scopePath?: string): Requestor {
    return {
      id: "requestor-1",
      role: Roles.ADMIN,
      scopeOrganization: scopePath ? { path: scopePath } : null,
    } as unknown as Requestor;
  }

  function buildService(
    organizations: Record<string, { id: string; path: string }>,
  ) {
    const prisma = {
      organization: {
        findUnique: jest.fn(({ where: { id } }: { where: { id: string } }) =>
          Promise.resolve(organizations[id] ?? null),
        ),
      },
    } as unknown as PrismaService;
    return new ScopedPermissionService(prisma);
  }

  it("does nothing for a global admin (no scope)", async () => {
    const service = buildService({});
    await expect(
      service.assertCanAssignScopeToNewPrincipal(undefined, buildRequestor()),
    ).resolves.toBeUndefined();
  });

  it("rejects a scoped admin creating a token with no scope at all", async () => {
    const service = buildService({});
    await expect(
      service.assertCanAssignScopeToNewPrincipal(
        undefined,
        buildRequestor("DTNUM/TOTO"),
      ),
    ).rejects.toBeInstanceOf(ScopePermissionsException);
  });

  it("rejects a scope outside of the requestor's own scope", async () => {
    const service = buildService({
      "org-toto": { id: "org-toto", path: "TOTO" },
    });
    await expect(
      service.assertCanAssignScopeToNewPrincipal(
        "org-toto",
        buildRequestor("DTNUM/TOTO"),
      ),
    ).rejects.toBeInstanceOf(ScopePermissionsException);
  });

  it("allows a scope within the requestor's own scope", async () => {
    const service = buildService({
      "org-sub": { id: "org-sub", path: "DTNUM/TOTO/SUB" },
    });
    await expect(
      service.assertCanAssignScopeToNewPrincipal(
        "org-sub",
        buildRequestor("DTNUM/TOTO"),
      ),
    ).resolves.toBeUndefined();
  });
});

describe("ScopedPermissionService — assertCanImpersonate", () => {
  function buildRequestor(scopePath?: string): Requestor {
    return {
      id: "requestor-1",
      role: Roles.ADMIN,
      scopeOrganization: scopePath ? { path: scopePath } : null,
    } as unknown as Requestor;
  }

  function buildService(
    users: Record<
      string,
      { id: string; organization: { path: string } | null }
    >,
  ) {
    const prisma = {
      user: {
        findFirst: jest.fn(({ where: { id } }: { where: { id: string } }) =>
          Promise.resolve(users[id] ?? null),
        ),
      },
    } as unknown as PrismaService;
    return new ScopedPermissionService(prisma);
  }

  it("does nothing for a global admin (no scope)", async () => {
    const service = buildService({});
    await expect(
      service.assertCanImpersonate("target-1", buildRequestor()),
    ).resolves.toBeUndefined();
  });

  it("allows impersonating a user within the requestor's scope", async () => {
    const service = buildService({
      "target-1": {
        id: "target-1",
        organization: { path: "DTNUM/TOTO/SUB" },
      },
    });
    await expect(
      service.assertCanImpersonate("target-1", buildRequestor("DTNUM/TOTO")),
    ).resolves.toBeUndefined();
  });

  it("rejects impersonating a user outside the requestor's scope", async () => {
    const service = buildService({
      "target-1": { id: "target-1", organization: { path: "DGPN" } },
    });
    await expect(
      service.assertCanImpersonate("target-1", buildRequestor("DTNUM/TOTO")),
    ).rejects.toBeInstanceOf(ScopePermissionsException);
  });

  it("refuse d'impersonner un utilisateur sans organisation (#2371)", async () => {
    // Un compte sans organisation (ex. un super-administrateur global) n'est dans le périmètre
    // d'aucun admin scopé : il ne doit pas être impersonnable par ce dernier.
    const service = buildService({
      "target-1": { id: "target-1", organization: null },
    });
    await expect(
      service.assertCanImpersonate("target-1", buildRequestor("DTNUM/TOTO")),
    ).rejects.toBeInstanceOf(ScopePermissionsException);
  });

  it("throws 404 when the target user does not exist", async () => {
    const service = buildService({});
    await expect(
      service.assertCanImpersonate("ghost", buildRequestor("DTNUM/TOTO")),
    ).rejects.toMatchObject({ status: 404 });
  });
});
