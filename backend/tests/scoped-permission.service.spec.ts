import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { HttpException, HttpStatus } from "@nestjs/common";
import { Roles } from "@prisma/client";
import { ScopedPermissionService } from "src/user/scope-permission/scoped-permission.service";
import { PrismaService } from "src/prisma/prisma.service";
import { ScopePermissionsException } from "src/user/errors/scope-permissions.exception";
import type { Requestor } from "src/user/entities/user.entity";
import type { UpdateUserDto } from "src/user/dto/update-user.dto";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const ADMIN_SCOPE_PATH = "ROOT/ORG_A";

const orgInScope = { id: "org-in-scope", path: "ROOT/ORG_A/DEPT" };
const orgInScope2 = { id: "org-in-scope-2", path: "ROOT/ORG_A/DEPT2" };
const orgOutScope = { id: "org-out-scope", path: "ROOT/ORG_B/DEPT" };

const orgMap: Record<string, typeof orgInScope> = {
  [orgInScope.id]: orgInScope,
  [orgInScope2.id]: orgInScope2,
  [orgOutScope.id]: orgOutScope,
};

const scopedAdmin = {
  scopeOrganization: { id: "admin-scope-org", path: ADMIN_SCOPE_PATH },
} as unknown as Requestor;

const superAdmin = {
  scopeOrganization: null,
} as unknown as Requestor;

function makeUser(
  organizationId: string | null,
  scopeOrganizationId: string | null,
) {
  return {
    id: "target-user-1",
    organizationId,
    scopeOrganizationId,
    organization: organizationId ? (orgMap[organizationId] ?? null) : null,
    scopeOrganization: scopeOrganizationId
      ? (orgMap[scopeOrganizationId] ?? null)
      : null,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ScopedPermissionService", () => {
  let service: ScopedPermissionService;

  const mockPrismaService = {
    user: { findFirst: jest.fn() },
    organization: { findUnique: jest.fn() },
  };

  function setupOrgMock() {
    mockPrismaService.organization.findUnique.mockImplementation(
      ({ where: { id } }: { where: { id: string } }) =>
        Promise.resolve(orgMap[id] ?? null),
    );
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScopedPermissionService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();
    service = module.get<ScopedPermissionService>(ScopedPermissionService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Super admin — no scope, always allowed, no DB call
  // ──────────────────────────────────────────────────────────────────────────

  describe("super admin (no organization scope)", () => {
    it("does not query the database", async () => {
      const dto = {
        organizationId: orgInScope.id,
        scopeOrganizationId: null,
      } as UpdateUserDto;
      await service.assertCanUpdate("target-1", dto, superAdmin);
      expect(mockPrismaService.user.findFirst).not.toHaveBeenCalled();
    });

    describe("scopeOrganizationId", () => {
      it("SET none → organization: allowed", async () => {
        const dto = {
          organizationId: null,
          scopeOrganizationId: orgInScope.id,
        } as UpdateUserDto;
        await expect(
          service.assertCanUpdate("target-1", dto, superAdmin),
        ).resolves.toBeUndefined();
      });

      it("REMOVE organization → null: allowed", async () => {
        const dto = {
          organizationId: null,
          scopeOrganizationId: null,
        } as UpdateUserDto;
        await expect(
          service.assertCanUpdate("target-1", dto, superAdmin),
        ).resolves.toBeUndefined();
      });

      it("UPDATE organization → another organization: allowed", async () => {
        const dto = {
          organizationId: null,
          scopeOrganizationId: orgInScope2.id,
        } as UpdateUserDto;
        await expect(
          service.assertCanUpdate("target-1", dto, superAdmin),
        ).resolves.toBeUndefined();
      });
    });

    describe("organizationId", () => {
      it("SET none → organization: allowed", async () => {
        const dto = {
          organizationId: orgInScope.id,
          scopeOrganizationId: null,
        } as UpdateUserDto;
        await expect(
          service.assertCanUpdate("target-1", dto, superAdmin),
        ).resolves.toBeUndefined();
      });

      it("REMOVE organization → null: allowed", async () => {
        const dto = {
          organizationId: null,
          scopeOrganizationId: null,
        } as UpdateUserDto;
        await expect(
          service.assertCanUpdate("target-1", dto, superAdmin),
        ).resolves.toBeUndefined();
      });

      it("UPDATE organization → another organization: allowed", async () => {
        const dto = {
          organizationId: orgInScope2.id,
          scopeOrganizationId: null,
        } as UpdateUserDto;
        await expect(
          service.assertCanUpdate("target-1", dto, superAdmin),
        ).resolves.toBeUndefined();
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Scoped admin
  // ──────────────────────────────────────────────────────────────────────────

  describe("scoped admin (with organization scope)", () => {
    // ── Target user management permission ─────────────────────────────────

    describe("target user management permission", () => {
      it("throws 404 when the target user does not exist", async () => {
        mockPrismaService.user.findFirst.mockResolvedValue(null);
        await expect(
          service.assertCanUpdate(
            "unknown",
            {
              organizationId: null,
              scopeOrganizationId: null,
            } as UpdateUserDto,
            scopedAdmin,
          ),
        ).rejects.toThrow(
          new HttpException("Utilisateur introuvable", HttpStatus.NOT_FOUND),
        );
      });

      it("throws when the target user's organization is outside the admin's scope", async () => {
        mockPrismaService.user.findFirst.mockResolvedValue(
          makeUser(orgOutScope.id, null),
        );
        await expect(
          service.assertCanUpdate(
            "target-1",
            {
              organizationId: orgOutScope.id,
              scopeOrganizationId: null,
            } as UpdateUserDto,
            scopedAdmin,
          ),
        ).rejects.toThrow(ScopePermissionsException);
      });

      it("throws when the target user has no organization (#2371 — an orphan is out of any scoped admin's reach)", async () => {
        mockPrismaService.user.findFirst.mockResolvedValue(
          makeUser(null, null),
        );
        await expect(
          service.assertCanUpdate(
            "target-1",
            {
              organizationId: null,
              scopeOrganizationId: null,
            } as UpdateUserDto,
            scopedAdmin,
          ),
        ).rejects.toThrow(ScopePermissionsException);
      });

      it("allows managing a user whose organization is within the admin's scope", async () => {
        mockPrismaService.user.findFirst.mockResolvedValue(
          makeUser(orgInScope.id, null),
        );
        setupOrgMock();
        await expect(
          service.assertCanUpdate(
            "target-1",
            {
              organizationId: orgInScope.id,
              scopeOrganizationId: null,
            } as UpdateUserDto,
            scopedAdmin,
          ),
        ).resolves.toBeUndefined();
      });
    });

    // ── Escalade de privilèges (#2371) ────────────────────────────────────
    describe("privilege escalation", () => {
      const manageableTarget = (
        role: Roles = Roles.VISITOR,
        additionalPermissions: string[] = [],
      ) => ({
        ...makeUser(orgInScope.id, orgInScope.id),
        role,
        additionalPermissions,
      });

      it("refuse à un admin scopé de promouvoir une cible en ADMIN", async () => {
        mockPrismaService.user.findFirst.mockResolvedValue(manageableTarget());
        setupOrgMock();
        await expect(
          service.assertCanUpdate(
            "target-1",
            { role: Roles.ADMIN } as UpdateUserDto,
            scopedAdmin,
          ),
        ).rejects.toBeInstanceOf(ScopePermissionsException);
      });

      it("autorise un admin scopé à changer le rôle vers un rôle non-ADMIN", async () => {
        mockPrismaService.user.findFirst.mockResolvedValue(manageableTarget());
        setupOrgMock();
        await expect(
          service.assertCanUpdate(
            "target-1",
            { role: Roles.CONTRIBUTOR } as UpdateUserDto,
            scopedAdmin,
          ),
        ).resolves.toBeUndefined();
      });

      it("n'entrave pas une cible déjà ADMIN qui reste ADMIN", async () => {
        mockPrismaService.user.findFirst.mockResolvedValue(
          manageableTarget(Roles.ADMIN),
        );
        setupOrgMock();
        await expect(
          service.assertCanUpdate(
            "target-1",
            { role: Roles.ADMIN } as UpdateUserDto,
            scopedAdmin,
          ),
        ).resolves.toBeUndefined();
      });

      it("refuse à un admin scopé d'accorder des permissions additionnelles", async () => {
        mockPrismaService.user.findFirst.mockResolvedValue(manageableTarget());
        setupOrgMock();
        await expect(
          service.assertCanUpdate(
            "target-1",
            {
              additionalPermissions: ["AdminPanelManage"],
            } as unknown as UpdateUserDto,
            scopedAdmin,
          ),
        ).rejects.toBeInstanceOf(ScopePermissionsException);
      });

      it("autorise quand les permissions additionnelles sont inchangées", async () => {
        mockPrismaService.user.findFirst.mockResolvedValue(
          manageableTarget(Roles.VISITOR, ["DataExport"]),
        );
        setupOrgMock();
        await expect(
          service.assertCanUpdate(
            "target-1",
            {
              additionalPermissions: ["DataExport"],
            } as unknown as UpdateUserDto,
            scopedAdmin,
          ),
        ).resolves.toBeUndefined();
      });
    });

    // ── scopeOrganizationId ───────────────────────────────────────────────
    // La cible a une organisation DANS le périmètre : le contrôle initial de gestion passe
    // (#2371 — un compte sans organisation ne serait plus gérable par un admin scopé).

    describe("scopeOrganizationId", () => {
      beforeEach(() => {
        mockPrismaService.user.findFirst.mockResolvedValue(
          makeUser(orgInScope.id, null),
        );
        setupOrgMock();
      });

      describe("SET: none → organization", () => {
        it("allows when the new scope organization is within the admin's scope", async () => {
          const dto = {
            organizationId: null,
            scopeOrganizationId: orgInScope.id,
          } as UpdateUserDto;
          await expect(
            service.assertCanUpdate("target-1", dto, scopedAdmin),
          ).resolves.toBeUndefined();
        });

        it("throws when the new scope organization is outside the admin's scope", async () => {
          const dto = {
            organizationId: null,
            scopeOrganizationId: orgOutScope.id,
          } as UpdateUserDto;
          await expect(
            service.assertCanUpdate("target-1", dto, scopedAdmin),
          ).rejects.toThrow(ScopePermissionsException);
        });
      });

      describe("REMOVE: organization → null", () => {
        // Removing a scope is always forbidden for a scoped admin, regardless of
        // whether the current scope organization is inside or outside the admin's scope.

        it("always throws when the current scope organization is within the admin's scope", async () => {
          mockPrismaService.user.findFirst.mockResolvedValue(
            makeUser(orgInScope.id, orgInScope.id),
          );
          const dto = {
            organizationId: null,
            scopeOrganizationId: null,
          } as UpdateUserDto;
          await expect(
            service.assertCanUpdate("target-1", dto, scopedAdmin),
          ).rejects.toThrow(ScopePermissionsException);
        });

        it("always throws when the current scope organization is outside the admin's scope", async () => {
          mockPrismaService.user.findFirst.mockResolvedValue(
            makeUser(orgInScope.id, orgOutScope.id),
          );
          const dto = {
            organizationId: null,
            scopeOrganizationId: null,
          } as UpdateUserDto;
          await expect(
            service.assertCanUpdate("target-1", dto, scopedAdmin),
          ).rejects.toThrow(ScopePermissionsException);
        });
      });

      describe("UPDATE: organization → another organization", () => {
        beforeEach(() => {
          mockPrismaService.user.findFirst.mockResolvedValue(
            makeUser(orgInScope.id, orgInScope.id),
          );
        });

        it("allows when both the source (from) and target (to) scope organizations are within the admin's scope", async () => {
          const dto = {
            organizationId: null,
            scopeOrganizationId: orgInScope2.id,
          } as UpdateUserDto;
          await expect(
            service.assertCanUpdate("target-1", dto, scopedAdmin),
          ).resolves.toBeUndefined();
        });

        it("throws when the target (to) scope organization is outside the admin's scope", async () => {
          const dto = {
            organizationId: null,
            scopeOrganizationId: orgOutScope.id,
          } as UpdateUserDto;
          await expect(
            service.assertCanUpdate("target-1", dto, scopedAdmin),
          ).rejects.toThrow(ScopePermissionsException);
        });

        it("allows when the target (to) scope organization is within the admin's scope, even if the source (from) is outside", async () => {
          // Only the 'to' organization is checked for an UPDATE, not the 'from'
          mockPrismaService.user.findFirst.mockResolvedValue(
            makeUser(orgInScope.id, orgOutScope.id),
          );
          const dto = {
            organizationId: null,
            scopeOrganizationId: orgInScope.id,
          } as UpdateUserDto;
          await expect(
            service.assertCanUpdate("target-1", dto, scopedAdmin),
          ).resolves.toBeUndefined();
        });
      });
    });

    // ── omitted fields (undefined) ─────────────────────────────────────

    describe("omitted fields (undefined) should be treated as UNCHANGED", () => {
      it("does not crash when scopeOrganizationId is omitted from the dto", async () => {
        mockPrismaService.user.findFirst.mockResolvedValue(
          makeUser(orgInScope.id, orgInScope.id),
        );
        setupOrgMock();
        // organizationId inchangé (même valeur que la cible) → UNCHANGED, aucun lookup d'organisation.
        const dto = {
          organizationId: orgInScope.id,
        } as UpdateUserDto;
        await expect(
          service.assertCanUpdate("target-1", dto, scopedAdmin),
        ).resolves.toBeUndefined();
        expect(
          mockPrismaService.organization.findUnique,
        ).not.toHaveBeenCalled();
      });

      it("does not crash when organizationId is omitted from the dto", async () => {
        mockPrismaService.user.findFirst.mockResolvedValue(
          makeUser(orgInScope.id, null),
        );
        setupOrgMock();
        const dto = {
          scopeOrganizationId: null,
        } as UpdateUserDto;
        await expect(
          service.assertCanUpdate("target-1", dto, scopedAdmin),
        ).resolves.toBeUndefined();
        expect(
          mockPrismaService.organization.findUnique,
        ).not.toHaveBeenCalled();
      });

      it("does not crash when both fields are omitted from the dto", async () => {
        mockPrismaService.user.findFirst.mockResolvedValue(
          makeUser(orgInScope.id, orgInScope.id),
        );
        const dto = {} as UpdateUserDto;
        await expect(
          service.assertCanUpdate("target-1", dto, scopedAdmin),
        ).resolves.toBeUndefined();
        expect(
          mockPrismaService.organization.findUnique,
        ).not.toHaveBeenCalled();
      });
    });

    // ── organizationId ────────────────────────────────────────────────────

    describe("organizationId", () => {
      beforeEach(() => {
        setupOrgMock();
      });

      // #2371 : une cible sans organisation n'est dans le périmètre d'aucun admin scopé — il ne
      // peut donc pas l'« adopter » en lui assignant une organisation, même dans son périmètre.
      describe("SET: none → organization (cible orpheline)", () => {
        beforeEach(() => {
          mockPrismaService.user.findFirst.mockResolvedValue(
            makeUser(null, null),
          );
        });

        it("refuse d'assigner une organisation à une cible orpheline, même dans le périmètre", async () => {
          const dto = {
            organizationId: orgInScope.id,
            scopeOrganizationId: null,
          } as UpdateUserDto;
          await expect(
            service.assertCanUpdate("target-1", dto, scopedAdmin),
          ).rejects.toThrow(ScopePermissionsException);
        });

        it("refuse aussi quand l'organisation cible est hors périmètre", async () => {
          const dto = {
            organizationId: orgOutScope.id,
            scopeOrganizationId: null,
          } as UpdateUserDto;
          await expect(
            service.assertCanUpdate("target-1", dto, scopedAdmin),
          ).rejects.toThrow(ScopePermissionsException);
        });
      });

      describe("REMOVE: organization → null", () => {
        it("allows when the current organization is within the admin's scope", async () => {
          mockPrismaService.user.findFirst.mockResolvedValue(
            makeUser(orgInScope.id, null),
          );
          const dto = {
            organizationId: null,
            scopeOrganizationId: null,
          } as UpdateUserDto;
          await expect(
            service.assertCanUpdate("target-1", dto, scopedAdmin),
          ).resolves.toBeUndefined();
        });

        it("throws when the current organization is outside the admin's scope", async () => {
          mockPrismaService.user.findFirst.mockResolvedValue(
            makeUser(orgOutScope.id, null),
          );
          const dto = {
            organizationId: null,
            scopeOrganizationId: null,
          } as UpdateUserDto;
          await expect(
            service.assertCanUpdate("target-1", dto, scopedAdmin),
          ).rejects.toThrow(ScopePermissionsException);
        });
      });

      describe("UPDATE: organization → another organization", () => {
        it("allows when the source (from) is within scope, even if the target (to) is outside", async () => {
          // Only the 'from' organization is checked for an UPDATE, not the 'to'
          mockPrismaService.user.findFirst.mockResolvedValue(
            makeUser(orgInScope.id, null),
          );
          const dto = {
            organizationId: orgOutScope.id,
            scopeOrganizationId: null,
          } as UpdateUserDto;
          await expect(
            service.assertCanUpdate("target-1", dto, scopedAdmin),
          ).resolves.toBeUndefined();
        });

        it("throws when the source (from) organization is outside the admin's scope", async () => {
          mockPrismaService.user.findFirst.mockResolvedValue(
            makeUser(orgOutScope.id, null),
          );
          const dto = {
            organizationId: orgInScope.id,
            scopeOrganizationId: null,
          } as UpdateUserDto;
          await expect(
            service.assertCanUpdate("target-1", dto, scopedAdmin),
          ).rejects.toThrow(ScopePermissionsException);
        });
      });
    });
  });
});
