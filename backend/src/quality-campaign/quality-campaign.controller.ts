import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Permission } from "@prisma/client";
import { RequiredPermissions } from "src/common/decorators/required-permissions.decorator";
import { User } from "src/common/decorators/user.decorator";
import { PaginatedResponseDto, PaginationDto } from "src/common/dto";
import { PermissionGuard } from "src/common/guards/permission.guard";
import type { Requestor } from "src/user/entities/user.entity";
import {
  CreateQualityCampaignDto,
  UpdateQualityCampaignDto,
  UpdateQualityCampaignStatusDto,
} from "./dto/create-quality-campaign.dto";
import {
  QualityCampaignDto,
  QualityCampaignPreviewDto,
} from "./dto/quality-campaign.dto";
import { QualityCampaignService } from "./quality-campaign.service";

@ApiTags("Quality Campaigns")
@Controller("quality-campaigns")
@UseGuards(PermissionGuard)
export class QualityCampaignController {
  constructor(private readonly service: QualityCampaignService) {}

  @Post()
  @RequiredPermissions([Permission.QualityCampaignManage])
  @ApiOperation({ summary: "Créer une campagne de mise en qualité" })
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({
    description: "Campagne créée",
    type: QualityCampaignDto,
  })
  create(@User() user: Requestor, @Body() body: CreateQualityCampaignDto) {
    return this.service.create(user.id, body, user);
  }

  @Get()
  @RequiredPermissions([Permission.QualityCampaignManage])
  @ApiOperation({ summary: "Lister les campagnes de mise en qualité" })
  @ApiOkResponse({
    description: "Liste des campagnes",
    type: PaginatedResponseDto.of(QualityCampaignDto),
  })
  findAll(@User() user: Requestor, @Query() filters: PaginationDto) {
    return this.service.findAll(filters, user);
  }

  @Get(":id")
  @RequiredPermissions([Permission.QualityCampaignManage])
  @ApiOperation({
    summary: "Détail d'une campagne de mise en qualité, avec son impact",
  })
  @ApiOkResponse({ description: "Campagne", type: QualityCampaignDto })
  @ApiNotFoundResponse({ description: "Campagne non trouvée" })
  findOne(@User() user: Requestor, @Param("id") id: string) {
    return this.service.findOne(id, user);
  }

  @Get(":id/preview")
  @RequiredPermissions([Permission.QualityCampaignManage])
  @ApiOperation({
    summary:
      "Aperçu à la volée des applications actuellement matchées par le filtre de la campagne",
  })
  @ApiOkResponse({ description: "Aperçu", type: QualityCampaignPreviewDto })
  @ApiNotFoundResponse({ description: "Campagne non trouvée" })
  preview(@User() user: Requestor, @Param("id") id: string) {
    return this.service.preview(id, user);
  }

  @Patch(":id")
  @RequiredPermissions([Permission.QualityCampaignManage])
  @ApiOperation({ summary: "Modifier une campagne de mise en qualité" })
  @ApiOkResponse({
    description: "Campagne mise à jour",
    type: QualityCampaignDto,
  })
  @ApiNotFoundResponse({ description: "Campagne non trouvée" })
  update(@Param("id") id: string, @Body() body: UpdateQualityCampaignDto) {
    return this.service.update(id, body);
  }

  @Patch(":id/status")
  @RequiredPermissions([Permission.QualityCampaignManage])
  @ApiOperation({
    summary:
      "Changer librement le statut de la campagne (planifiée / en cours / terminée), dans n'importe quel sens",
  })
  @ApiOkResponse({
    description: "Campagne mise à jour",
    type: QualityCampaignDto,
  })
  @ApiNotFoundResponse({ description: "Campagne non trouvée" })
  updateStatus(
    @User() user: Requestor,
    @Param("id") id: string,
    @Body() body: UpdateQualityCampaignStatusDto,
  ) {
    return this.service.updateStatus(id, body.status, user);
  }

  @Delete(":id")
  @RequiredPermissions([Permission.QualityCampaignManage])
  @ApiOperation({ summary: "Supprimer une campagne de mise en qualité" })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: "Campagne supprimée" })
  @ApiNotFoundResponse({ description: "Campagne non trouvée" })
  remove(@Param("id") id: string) {
    return this.service.delete(id);
  }

  @Post(":id/send")
  @RequiredPermissions([Permission.QualityCampaignManage])
  @ApiOperation({
    summary:
      "Déclencher immédiatement l'envoi de la campagne aux acteurs des applications ciblées",
  })
  @ApiOkResponse({ description: "Campagne envoyée", type: QualityCampaignDto })
  @ApiNotFoundResponse({ description: "Campagne non trouvée" })
  send(@User() user: Requestor, @Param("id") id: string) {
    return this.service.sendCampaign(id, user);
  }

  @Post(":id/send-sponsor-report")
  @RequiredPermissions([Permission.QualityCampaignManage])
  @ApiOperation({
    summary:
      "Envoyer au sponsor de la campagne un email récapitulatif de l'impact courant",
  })
  @ApiOkResponse({ description: "Rapport envoyé", type: QualityCampaignDto })
  @ApiNotFoundResponse({ description: "Campagne non trouvée" })
  sendSponsorReport(@Param("id") id: string) {
    return this.service.sendSponsorReport(id);
  }
}
