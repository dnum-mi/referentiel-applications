import { PrismaService } from "src/prisma/prisma.service";
import { Requestor } from "../entities/user.entity";
import { ScopePermissionsException } from "../errors/scope-permissions.exception";
import { ScopedPermissionService } from "./scoped-permission.service";

describe("ScopedPermissionService — assertCanAssignScopeToNewPrincipal", () => {
  function buildRequestor(scopePath?: string): Requestor {
    return {
      id: "requestor-1",
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
