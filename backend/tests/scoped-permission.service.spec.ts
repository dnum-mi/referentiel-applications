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
  id: "scoped-admin-1",
  role: Roles.ADMIN,
  scopeOrganization: { id: "admin-scope-org", path: ADMIN_SCOPE_PATH },
} as unknown as Requestor;

const superAdmin = {
  id: "super-admin-1",
  role: Roles.ADMIN,
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

// ─── #2498 : rôle ADMIN obligatoire pour administrer les utilisateurs ─────────

describe("ScopedPermissionService — rôle administrateur requis (#2498)", () => {
  let service: ScopedPermissionService;
  const mockPrismaService = {
    user: { findFirst: jest.fn() },
    organization: { findUnique: jest.fn() },
  };

  // Contributeur à qui l'on a délégué AdminPanelManage, SANS périmètre : avant #2498 il
  // passait tous les contrôles comme un super-administrateur.
  const delegatedContributor = {
    id: "delegated-1",
    role: Roles.CONTRIBUTOR,
    additionalPermissions: ["AdminPanelManage"],
    scopeOrganization: null,
  } as unknown as Requestor;

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

  it("refuse la mise à jour d'un utilisateur par un non-admin sans périmètre", async () => {
    await expect(
      service.assertCanUpdate(
        "target-1",
        { role: Roles.ADMIN } as UpdateUserDto,
        delegatedContributor,
      ),
    ).rejects.toBeInstanceOf(ScopePermissionsException);
    expect(mockPrismaService.user.findFirst).not.toHaveBeenCalled();
  });

  it("refuse l'impersonation, le blocage et l'assignation de périmètre par un non-admin", async () => {
    await expect(
      service.assertCanImpersonate("target-1", delegatedContributor),
    ).rejects.toBeInstanceOf(ScopePermissionsException);
    await expect(
      service.assertCanBlock("target-1", delegatedContributor),
    ).rejects.toBeInstanceOf(ScopePermissionsException);
    await expect(
      service.assertCanAssignScopeToNewPrincipal(null, delegatedContributor),
    ).rejects.toBeInstanceOf(ScopePermissionsException);
  });

  it("refuse à un non-admin de se promouvoir lui-même", async () => {
    await expect(
      service.assertCanUpdate(
        delegatedContributor.id,
        { role: Roles.ADMIN } as UpdateUserDto,
        delegatedContributor,
      ),
    ).rejects.toBeInstanceOf(ScopePermissionsException);
  });

  describe("auto-modification par un administrateur", () => {
    const self = {
      id: "super-admin-1",
      role: Roles.ADMIN,
      scopeOrganizationId: "admin-scope-org",
      additionalPermissions: ["DataExport"],
      scopeOrganization: { id: "admin-scope-org", path: ADMIN_SCOPE_PATH },
    } as unknown as Requestor;

    it("un administrateur peut désormais changer son propre rôle (aucun verrou d'auto-privilège)", async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        ...makeUser(orgInScope.id, "admin-scope-org"),
        id: self.id,
        role: Roles.ADMIN,
        additionalPermissions: ["DataExport"],
      });
      mockPrismaService.organization.findUnique.mockImplementation(
        ({ where: { id } }: { where: { id: string } }) =>
          Promise.resolve(orgMap[id] ?? null),
      );

      await expect(
        service.assertCanUpdate(
          self.id,
          { role: Roles.CONTRIBUTOR } as UpdateUserDto,
          self,
        ),
      ).resolves.toBeUndefined();
    });

    it("le retrait de son propre périmètre reste réservé à un administrateur global, comme pour un tiers", async () => {
      // Pas un verrou d'auto-privilège : assertScopeOrganizationAction interdit à TOUT admin
      // scopé de retirer un périmètre, le sien comme celui d'un tiers.
      mockPrismaService.user.findFirst.mockResolvedValue({
        ...makeUser(orgInScope.id, "admin-scope-org"),
        id: self.id,
        role: Roles.ADMIN,
        additionalPermissions: ["DataExport"],
      });
      mockPrismaService.organization.findUnique.mockImplementation(
        ({ where: { id } }: { where: { id: string } }) =>
          Promise.resolve(orgMap[id] ?? null),
      );

      await expect(
        service.assertCanUpdate(
          self.id,
          { scopeOrganizationId: null } as UpdateUserDto,
          self,
        ),
      ).rejects.toThrow(
        "Seul un administrateur global peut supprimer le périmètre d'un utilisateur",
      );
    });

    it("un admin SCOPÉ ne peut pas changer ses propres permissions déléguées (réservé au global, pas au self)", async () => {
      // #2608 : ce n'est plus assertNotSelfPrivilegeChange qui bloque ici (les permissions
      // déléguées sont sorties de ce verrou), mais assertNoPrivilegeEscalation — un admin scopé
      // ne peut modifier additionalPermissions pour PERSONNE, lui y compris.
      mockPrismaService.user.findFirst.mockResolvedValue({
        ...makeUser(orgInScope.id, "admin-scope-org"),
        id: self.id,
        role: Roles.ADMIN,
        additionalPermissions: ["DataExport"],
      });
      mockPrismaService.organization.findUnique.mockImplementation(
        ({ where: { id } }: { where: { id: string } }) =>
          Promise.resolve(orgMap[id] ?? null),
      );

      await expect(
        service.assertCanUpdate(
          self.id,
          {
            additionalPermissions: ["DataExport", "CreateApplication"],
          } as UpdateUserDto,
          self,
        ),
      ).rejects.toThrow(
        "Seul un administrateur global peut modifier les permissions additionnelles",
      );
    });

    it("un admin GLOBAL peut s'accorder/se retirer lui-même une permission déléguée (#2608)", async () => {
      // additionalPermissions est déjà borné en amont à DELEGABLE_PERMISSIONS (liste fermée sans
      // risque d'escalade) : un admin global n'a donc pas besoin d'un autre admin pour se
      // l'accorder, comme il pourrait le faire pour un tiers. Un admin SCOPÉ, lui, ne peut
      // toucher additionalPermissions pour personne (cf. test ci-dessus) — self ou tiers.
      await expect(
        service.assertCanUpdate(
          superAdmin.id,
          {
            additionalPermissions: [
              "QualityCampaignManage",
              "MditCampaignManage",
            ],
          } as UpdateUserDto,
          { ...superAdmin, additionalPermissions: [] } as unknown as Requestor,
        ),
      ).resolves.toBeUndefined();
      // Admin global : sort avant tout appel base de données (comme pour les autres actions).
      expect(mockPrismaService.user.findFirst).not.toHaveBeenCalled();
    });

    it("laisse passer une mise à jour de soi qui ne touche pas aux droits", async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        ...makeUser(orgInScope.id, "admin-scope-org"),
        id: self.id,
        role: Roles.ADMIN,
        additionalPermissions: ["DataExport"],
      });
      mockPrismaService.organization.findUnique.mockImplementation(
        ({ where: { id } }: { where: { id: string } }) =>
          Promise.resolve(orgMap[id] ?? null),
      );
      await expect(
        service.assertCanUpdate(
          self.id,
          {
            role: Roles.ADMIN,
            organizationId: orgInScope2.id,
            additionalPermissions: ["DataExport"],
          } as UpdateUserDto,
          self,
        ),
      ).resolves.toBeUndefined();
    });
  });
});
