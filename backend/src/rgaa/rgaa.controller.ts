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
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { Permission } from "@prisma/client";
import { RequiredPermissions } from "src/common/decorators/required-permissions.decorator";
import { PermissionGuard } from "src/common/guards/permission.guard";
import {
  CreateRgaaComplianceDto,
  RgaaComplianceDto,
} from "./dto/rgaa-compliance.dto";
import { RgaaService } from "./rgaa.service";

@ApiTags("RGAA Compliances")
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
  @ApiParam({ name: "applicationId", description: "ID de l'application" })
  async create(
    @Param("applicationId") applicationId: string,
    @Body() dto: CreateRgaaComplianceDto,
  ) {
    return this.rgaaService.create(applicationId, dto);
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
    @Param("id") id: string,
    @Body() dto: CreateRgaaComplianceDto,
  ) {
    return this.rgaaService.update(id, applicationId, dto);
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
    @Param("applicationId") applicationId: string,
    @Param("id") id: string,
  ) {
    await this.rgaaService.delete(id, applicationId);
  }
}
