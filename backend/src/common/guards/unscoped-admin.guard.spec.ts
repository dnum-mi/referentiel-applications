import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { UnscopedAdminGuard } from "./unscoped-admin.guard";

function contextWithUser(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe("UnscopedAdminGuard", () => {
  const guard = new UnscopedAdminGuard();

  it("refuse une requête sans utilisateur", () => {
    expect(guard.canActivate(contextWithUser(undefined))).toBe(false);
  });

  it("laisse passer un administrateur global (sans périmètre)", () => {
    expect(
      guard.canActivate(contextWithUser({ scopeOrganizationId: null })),
    ).toBe(true);
  });

  it("refuse (403) un compte restreint à un périmètre", () => {
    expect(() =>
      guard.canActivate(contextWithUser({ scopeOrganizationId: "org-1" })),
    ).toThrow(ForbiddenException);
  });
});
