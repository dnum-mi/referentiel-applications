import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import {
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { Permission } from "@prisma/client";
import { Impersonator } from "src/common/decorators/impersonator.decorator";
import { RequiredPermissions } from "src/common/decorators/required-permissions.decorator";
import { UserId } from "src/common/decorators/user-id.decorator";
import { PermissionGuard } from "src/common/guards/permission.guard";
import { UnscopedAdminGuard } from "src/common/guards/unscoped-admin.guard";
import { Requestor } from "src/user/entities/user.entity";
import {
  FeatureFlagDto,
  FeatureFlagLogDto,
  UpdateFeatureFlagDto,
} from "./dto/feature-flag.dto";
import { FeatureFlagService } from "./feature-flag.service";

@ApiTags("FeatureFlags")
// Le feature flipping a un effet GLOBAL : réservé aux administrateurs globaux,
// un admin restreint à un périmètre (scopeOrganizationId) est refusé (403).
@UseGuards(PermissionGuard, UnscopedAdminGuard)
@Controller("feature-flags")
export class FeatureFlagController {
  constructor(private readonly featureFlagService: FeatureFlagService) {}

  @Get()
  @RequiredPermissions([Permission.AdminPanelManage])
  @ApiOperation({
    summary: "Lister les feature flags.",
    description:
      "Retourne l'ensemble des feature flags connus avec leur état courant.",
  })
  @ApiOkResponse({
    description: "Liste des feature flags",
    type: [FeatureFlagDto],
  })
  @ApiForbiddenResponse({
    description:
      "Accès refusé - Réservé aux administrateurs globaux (non scopés)",
  })
  findAll(): Promise<FeatureFlagDto[]> {
    return this.featureFlagService.findAll();
  }

  @Get(":key/history")
  @RequiredPermissions([Permission.AdminPanelManage])
  @ApiOperation({
    summary: "Historique des bascules d'un feature flag.",
    description:
      "Les 20 dernières bascules du flag, de la plus récente à la plus ancienne, avec l'auteur de chacune.",
  })
  @ApiParam({ name: "key", description: "Clé technique du flag" })
  @ApiOkResponse({
    description: "Historique des bascules",
    type: [FeatureFlagLogDto],
  })
  @ApiForbiddenResponse({
    description:
      "Accès refusé - Réservé aux administrateurs globaux (non scopés)",
  })
  @ApiNotFoundResponse({ description: "Feature flag non trouvé" })
  history(@Param("key") key: string): Promise<FeatureFlagLogDto[]> {
    return this.featureFlagService.history(key);
  }

  @Patch(":key")
  @RequiredPermissions([Permission.AdminPanelManage])
  @ApiOperation({
    summary: "Basculer un feature flag.",
    description:
      "Active ou désactive un feature flag à chaud, sans redéploiement.",
  })
  @ApiParam({ name: "key", description: "Clé technique du flag à modifier" })
  @ApiOkResponse({
    description: "Feature flag mis à jour avec succès",
    type: FeatureFlagDto,
  })
  @ApiForbiddenResponse({
    description:
      "Accès refusé - Réservé aux administrateurs globaux (non scopés)",
  })
  @ApiNotFoundResponse({ description: "Feature flag non trouvé" })
  update(
    @Param("key") key: string,
    @Body() updateFeatureFlagDto: UpdateFeatureFlagDto,
    @UserId() userId?: string,
    @Impersonator() impersonator?: Requestor,
  ): Promise<FeatureFlagDto> {
    // Audit : en cas d'impersonation, la bascule est imputée à l'admin RÉEL,
    // pas à l'utilisateur impersonné.
    return this.featureFlagService.update(
      key,
      updateFeatureFlagDto,
      impersonator?.id ?? userId,
    );
  }
}
