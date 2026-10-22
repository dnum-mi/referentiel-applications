import { Permission, Roles } from "@prisma/client";
import type { Requestor, UserEntity } from "src/user/entities/user.entity";
import { ScopePermissionsException } from "src/user/errors/scope-permissions.exception";
import {
  IMPERSONATION_AUTH,
  impersonateWithinCeiling,
} from "./impersonation-auth";
import { principalToPermissions } from "./role-to-permissions";

const scope = { id: "scope-1", path: "/AUDIT" };
const team = { id: "team-1", path: "/AUDIT/TEAM" };

function administrator(overrides: Partial<Requestor> = {}): Requestor {
  const admin = {
    id: "admin-1",
    role: Roles.ADMIN,
    scopeOrganizationId: scope.id,
    scopeOrganization: scope,
    additionalPermissions: [],
    ...overrides,
  } as Requestor;
  return { ...admin, permissions: principalToPermissions(admin) };
}

function target(overrides: Partial<UserEntity> = {}): UserEntity {
  return {
    id: "target-1",
    role: Roles.CONTRIBUTOR,
    organizationId: team.id,
    organization: team,
    scopeOrganizationId: null,
    scopeOrganization: null,
    additionalPermissions: [],
    ...overrides,
  } as UserEntity;
}

describe("Impersonation privilege ceiling (#2925)", () => {
  it("bounds an unscoped target without mutating either identity or leaking context", () => {
    const admin = administrator();
    const original = target();
    const principal = impersonateWithinCeiling(admin, original);

    expect(principal.scopeOrganizationId).toBe(scope.id);
    expect(principal[IMPERSONATION_AUTH]).toMatchObject({
      admin,
      target: { id: original.id, scopeOrganizationId: null },
    });
    expect(original.scopeOrganizationId).toBeNull();
    expect(JSON.parse(JSON.stringify(principal))).not.toHaveProperty("admin");
    expect(JSON.stringify(principal)).not.toContain(admin.id);
  });

  it("retains a narrower target scope and its original application permissions", () => {
    const principal = impersonateWithinCeiling(
      administrator(),
      target({
        scopeOrganizationId: team.id,
        scopeOrganization: team,
      } as Partial<UserEntity>),
    );
    expect(principal.scopeOrganizationId).toBe(team.id);
    expect(principal[IMPERSONATION_AUTH].target.scopeOrganizationId).toBe(
      team.id,
    );
  });

  it.each([
    ["source", { scopeOrganizationId: scope.id, scopeOrganization: null }, {}],
    ["target", {}, { scopeOrganizationId: team.id, scopeOrganization: null }],
  ] as const)(
    "rejects an unresolved %s scope",
    (_label, source, destination) => {
      expect(() =>
        impersonateWithinCeiling(administrator(source), target(destination)),
      ).toThrow(ScopePermissionsException);
    },
  );

  it("rejects a global administrator attached to the source organization", () => {
    expect(() =>
      impersonateWithinCeiling(administrator(), target({ role: Roles.ADMIN })),
    ).toThrow(ScopePermissionsException);
  });

  it("uses additional permissions when comparing global capabilities", () => {
    const destination = target({
      additionalPermissions: [Permission.QualityCampaignManage],
    });
    expect(() =>
      impersonateWithinCeiling(administrator(), destination),
    ).toThrow(ScopePermissionsException);
    expect(
      impersonateWithinCeiling(
        administrator({
          additionalPermissions: [Permission.QualityCampaignManage],
        }),
        destination,
      ).additionalPermissions,
    ).toContain(Permission.QualityCampaignManage);
  });

  it("preserves global administrators' existing impersonation capability", () => {
    const principal = impersonateWithinCeiling(
      administrator({ scopeOrganizationId: null, scopeOrganization: null }),
      target({ role: Roles.ADMIN, organization: null }),
    );
    expect(principal.permissions).toContain(Permission.GlobalAdminManage);
    expect(principal[IMPERSONATION_AUTH]).toBeUndefined();
  });
});
