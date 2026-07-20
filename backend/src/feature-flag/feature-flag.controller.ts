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
import { RequiredPermissions } from "src/common/decorators/required-permissions.decorator";
import { UserId } from "src/common/decorators/user-id.decorator";
import { PermissionGuard } from "src/common/guards/permission.guard";
import { FeatureFlagDto, UpdateFeatureFlagDto } from "./dto/feature-flag.dto";
import { FeatureFlagService } from "./feature-flag.service";

@ApiTags("FeatureFlags")
@UseGuards(PermissionGuard)
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
    description: "Accès refusé - Privilège admin requis",
  })
  findAll(): Promise<FeatureFlagDto[]> {
    return this.featureFlagService.findAll();
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
    description: "Accès refusé - Privilège admin requis",
  })
  @ApiNotFoundResponse({ description: "Feature flag non trouvé" })
  update(
    @Param("key") key: string,
    @Body() updateFeatureFlagDto: UpdateFeatureFlagDto,
    @UserId() userId?: string,
  ): Promise<FeatureFlagDto> {
    return this.featureFlagService.update(key, updateFeatureFlagDto, userId);
  }
}
