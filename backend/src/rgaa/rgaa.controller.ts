import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { Permission } from "@prisma/client";
import { RequiredPermissions } from "src/common/decorators/required-permissions.decorator";
import { PermissionGuard } from "src/common/guards/permission.guard";
import { UserId } from "src/common/decorators/user-id.decorator";
import {
  CreateRgaaComplianceDto,
  RgaaComplianceDto,
  RgaaComplianceErrorResponseDto,
} from "./dto/rgaa-compliance.dto";
import { RgaaService } from "./rgaa.service";

const RGAA_METADATA_FIELDS = {
  audit_date: "date d'audit",
  service_url: "URL du service",
  accessibility_url: "URL de déclaration d'accessibilité",
  score_percentage: "score d'accessibilité (%)",
};

@ApiTags("RGAA Compliances")
@ApiExtraModels(RgaaComplianceErrorResponseDto)
@UseGuards(PermissionGuard)
@Controller("applications/:applicationId/rgaa-compliances")
export class RgaaController {
  constructor(private readonly rgaaService: RgaaService) {}

  @Get()
  @RequiredPermissions([Permission.ComplianceRead])
  @ApiOperation({
    summary: "Lister les conformités RGAA d'une application",
  })
  @ApiOkResponse({
    description: "Liste des conformités RGAA",
    type: [RgaaComplianceDto],
  })
  @ApiParam({ name: "applicationId", description: "ID de l'application" })
  async findAll(@Param("applicationId") applicationId: string) {
    return this.rgaaService.findAllByApplicationId(applicationId);
  }

  @Post()
  @RequiredPermissions([Permission.ComplianceWrite])
  @ApiOperation({
    summary: "Créer une conformité RGAA pour une application",
  })
  @ApiCreatedResponse({
    description: "Conformité RGAA créée avec succès",
    type: RgaaComplianceDto,
  })
  @ApiConflictResponse({
    description: "Une conformité RGAA existe déjà pour cette application",
    type: RgaaComplianceErrorResponseDto,
  })
  @ApiParam({ name: "applicationId", description: "ID de l'application" })
  async create(
    @UserId() userId: string,
    @Param("applicationId") applicationId: string,
    @Body() dto: CreateRgaaComplianceDto,
  ) {
    return this.rgaaService.createRgaa(applicationId, dto, {
      applicationId,
      triggerQualityUpdate: true,
      metadata: {
        userId,
        gender: "de la conformité RGAA",
        getColumn: () => dto.service_url,
        entity: "rgaaComplianceId",
        fields: RGAA_METADATA_FIELDS,
      },
    });
  }

  @Patch(":id")
  @RequiredPermissions([Permission.ComplianceWrite])
  @HttpCode(200)
  @ApiOperation({
    summary: "Mettre à jour une conformité RGAA",
  })
  @ApiOkResponse({
    description: "Conformité RGAA mise à jour avec succès",
    type: RgaaComplianceDto,
  })
  @ApiParam({ name: "applicationId", description: "ID de l'application" })
  @ApiParam({ name: "id", description: "ID de la conformité RGAA" })
  async update(
    @Param("applicationId") applicationId: string,
    @UserId() userId: string,
    @Param("id") id: string,
    @Body() dto: CreateRgaaComplianceDto,
  ) {
    return this.rgaaService.updateRgaa(id, applicationId, dto, {
      applicationId,
      triggerQualityUpdate: true,
      metadata: {
        userId,
        gender: "de la conformité RGAA",
        getColumn: () => dto.service_url,
        entity: "rgaaComplianceId",
        fields: RGAA_METADATA_FIELDS,
      },
    });
  }

  @Delete(":id")
  @RequiredPermissions([Permission.ComplianceWrite])
  @HttpCode(204)
  @ApiOperation({
    summary: "Supprimer une conformité RGAA",
  })
  @ApiNoContentResponse({
    description: "Conformité RGAA supprimée",
  })
  @ApiParam({ name: "applicationId", description: "ID de l'application" })
  @ApiParam({ name: "id", description: "ID de la conformité RGAA" })
  async delete(
    @UserId() userId: string,
    @Param("applicationId") applicationId: string,
    @Param("id") id: string,
  ) {
    await this.rgaaService.deleteRgaa(id, applicationId, {
      applicationId,
      triggerQualityUpdate: true,
      metadata: {
        userId,
        gender: "de la conformité RGAA",
        getColumn: (entity) => entity.service_url,
        entity: "rgaaComplianceId",
        fields: RGAA_METADATA_FIELDS,
      },
    });
  }
}
