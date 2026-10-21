import "reflect-metadata";
import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Permission, Roles, UserType } from "@prisma/client";
import * as betaFeatures from "src/features/beta-features";
import { FeatureId } from "src/features/beta-features";
import { principalToPermissions } from "src/permissions/role-to-permissions";
import type { PrismaService } from "src/prisma/prisma.service";
import type { Requestor } from "src/user/entities/user.entity";
import { RequiredPermissions } from "../decorators/required-permissions.decorator";
import { RequiresBetaFeature } from "../decorators/requires-beta-feature.decorator";
import { CheckPermissions } from "../service/check-permissions.service";
import type { QueryBuilderGroupActor } from "../service/prisma-query-builder.service";
import { BetaFeatureGuard } from "./beta-feature.guard";
import { PermissionGuard } from "./permission.guard";

class ExportController {
  @RequiredPermissions([Permission.DataExport])
  @RequiresBetaFeature(FeatureId.CatalogueExcelExport)
  exportExcel() {}

  @RequiredPermissions([Permission.AppRead])
  @RequiresBetaFeature(FeatureId.ProductHtmlExport)
  exportProductHtml() {}

  ordinaryRoute() {}
}

function principal(additionalPermissions: Permission[] = []): Requestor {
  return {
    id: "user-1",
    email: "user@example.test",
    role: Roles.VISITOR,
    type: UserType.human,
    organizationId: null,
    scopeOrganizationId: null,
    isBlocked: false,
    permissions: principalToPermissions({ role: Roles.VISITOR }),
    additionalPermissions,
  };
}

function contextFor(
  user?: Requestor,
  handler = ExportController.prototype.exportExcel,
): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => ExportController,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe("BetaFeatureGuard", () => {
  const reflector = new Reflector();
  // Les contrôles globaux n'effectuent aucune lecture applicative.
  const permissions = new CheckPermissions(
    {} as PrismaService,
    {} as QueryBuilderGroupActor,
  );
  const betaGuard = new BetaFeatureGuard(reflector, permissions);
  const businessGuard = new PermissionGuard(reflector, permissions);

  afterEach(() => jest.restoreAllMocks());

  it("ne restreint pas une route sans fonctionnalité bêta", async () => {
    await expect(
      betaGuard.canActivate(
        contextFor(undefined, ExportController.prototype.ordinaryRoute),
      ),
    ).resolves.toBe(true);
  });

  it("refuse explicitement une permission absente, même avec le droit métier", async () => {
    const context = contextFor(principal([Permission.DataExport]));
    await expect(businessGuard.canActivate(context)).resolves.toBe(true);
    await expect(betaGuard.canActivate(context)).rejects.toMatchObject({
      response: {
        statusCode: 403,
        betaFeatureRequired: true,
        featureId: FeatureId.CatalogueExcelExport,
      },
    });
  });

  it("refuse une requête sans identité", async () => {
    await expect(betaGuard.canActivate(contextFor())).rejects.toMatchObject({
      status: 403,
    });
  });

  it("réévalue l'attribution puis le retrait sans mémoriser une autorisation précédente", async () => {
    await expect(
      betaGuard.canActivate(contextFor(principal([Permission.DataExport]))),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      betaGuard.canActivate(
        contextFor(principal([Permission.DataExport, Permission.BetaFeatures])),
      ),
    ).resolves.toBe(true);
    await expect(
      betaGuard.canActivate(contextFor(principal([Permission.DataExport]))),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("n'accorde aucun droit métier implicite", async () => {
    const context = contextFor(principal([Permission.BetaFeatures]));
    await expect(betaGuard.canActivate(context)).resolves.toBe(true);
    await expect(businessGuard.canActivate(context)).resolves.toBe(false);
  });

  it("garde AppRead et BetaFeatures comme deux contrôles indépendants pour une fiche", async () => {
    const can = jest
      .spyOn(permissions, "can")
      .mockImplementation(async (required) =>
        required.includes(Permission.BetaFeatures),
      );
    const user = principal([Permission.BetaFeatures]);
    const context = contextFor(
      user,
      ExportController.prototype.exportProductHtml,
    );
    await expect(betaGuard.canActivate(context)).resolves.toBe(true);
    await expect(businessGuard.canActivate(context)).resolves.toBe(false);
    expect(can).toHaveBeenCalledWith([Permission.BetaFeatures], user);
    expect(can).toHaveBeenCalledWith([Permission.AppRead], user, undefined);
  });

  it("lève seulement le contrôle bêta après la sortie du registre", async () => {
    jest.spyOn(betaFeatures, "isBetaFeature").mockReturnValue(false);
    const context = contextFor(principal());
    await expect(betaGuard.canActivate(context)).resolves.toBe(true);
    await expect(businessGuard.canActivate(context)).resolves.toBe(false);
  });
});
