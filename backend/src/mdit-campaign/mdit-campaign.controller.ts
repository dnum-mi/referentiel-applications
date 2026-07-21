import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Permission } from "@prisma/client";
import { RequiredPermissions } from "src/common/decorators/required-permissions.decorator";
import { FeatureFlag } from "src/common/decorators/feature-flag.decorator";
import { PaginatedResponseDto } from "src/common/dto";
import { PermissionGuard } from "src/common/guards/permission.guard";
import { FeatureFlagGuard } from "src/feature-flag/feature-flag.guard";
import { FeatureFlagKey } from "src/feature-flag/feature-flag.keys";
import {
  CreateMditCampaignDto,
  MditCampaignDto,
  MditCampaignFiltersDto,
  UpdateMditCampaignDto,
} from "./dto/mdit-campaign.dto";
import { MditCampaignService } from "./mdit-campaign.service";

@ApiTags("MDIT Campaigns")
@Controller("mdit-campaigns")
@FeatureFlag(FeatureFlagKey.MDIT_CAMPAIGNS)
@UseGuards(PermissionGuard, FeatureFlagGuard)
@ApiNotFoundResponse({ description: "Ressource non trouvée" })
export class MditCampaignController {
  constructor(private readonly mditCampaignService: MditCampaignService) {}

  @Post()
  @RequiredPermissions([Permission.AdminPanelManage])
  @ApiOperation({ summary: "Créer une campagne dette IT (millésime)" })
  @HttpCode(201)
  @ApiCreatedResponse({
    description: "Campagne créée avec succès",
    type: MditCampaignDto,
  })
  @ApiConflictResponse({
    description: "Une campagne existe déjà pour ce millésime",
  })
  @ApiForbiddenResponse({
    description: "Accès refusé - Privilège admin requis",
  })
  create(@Body() createDto: CreateMditCampaignDto) {
    return this.mditCampaignService.createCampaign(createDto);
  }

  @Get()
  @ApiOperation({
    summary:
      "Lister les campagnes dette IT, triées du millésime le plus récent au plus ancien",
  })
  @ApiOkResponse({
    description: "Liste des campagnes",
    type: PaginatedResponseDto.of(MditCampaignDto),
  })
  findAll(@Query() filters: MditCampaignFiltersDto) {
    return this.mditCampaignService.findAllCampaigns(filters);
  }

  @Patch(":id")
  @RequiredPermissions([Permission.AdminPanelManage])
  @ApiOperation({ summary: "Modifier une campagne dette IT" })
  @ApiOkResponse({ description: "Campagne mise à jour", type: MditCampaignDto })
  @ApiConflictResponse({
    description: "Une campagne existe déjà pour ce millésime",
  })
  @ApiForbiddenResponse({
    description: "Accès refusé - Privilège admin requis",
  })
  @ApiNotFoundResponse({ description: "Campagne non trouvée" })
  update(@Param("id") id: string, @Body() updateDto: UpdateMditCampaignDto) {
    return this.mditCampaignService.updateCampaign(id, updateDto);
  }

  @Delete(":id")
  @RequiredPermissions([Permission.AdminPanelManage])
  @ApiOperation({ summary: "Supprimer une campagne dette IT" })
  @HttpCode(204)
  @ApiNoContentResponse({ description: "Campagne supprimée avec succès" })
  @ApiForbiddenResponse({
    description: "Accès refusé - Privilège admin requis",
  })
  @ApiNotFoundResponse({ description: "Campagne non trouvée" })
  remove(@Param("id") id: string) {
    return this.mditCampaignService.delete(id);
  }
}
