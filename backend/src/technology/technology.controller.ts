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
  CreateTechnologyDto,
  TechnologyDto,
  TechnologyErrorResponseDto,
} from "./dto/technology.dto";
import { TechnologyService } from "./technology.service";

const TECHNOLOGY_METADATA_FIELDS = {
  technology: "technologie",
  version: "version",
};

@ApiTags("Technologies")
@ApiExtraModels(TechnologyErrorResponseDto)
@UseGuards(PermissionGuard)
@Controller("applications/:applicationId/technologies")
export class TechnologyController {
  constructor(private readonly technologyService: TechnologyService) {}

  @Get()
  @RequiredPermissions([Permission.AppRead])
  @ApiOperation({
    summary: "Lister la stack technique d'une application",
  })
  @ApiOkResponse({
    description: "Liste des technologies",
    type: [TechnologyDto],
  })
  @ApiParam({ name: "applicationId", description: "ID de l'application" })
  async findAll(@Param("applicationId") applicationId: string) {
    return this.technologyService.findAllByApplicationId(applicationId);
  }

  @Post()
  @RequiredPermissions([Permission.AppWrite])
  @ApiOperation({
    summary: "Ajouter une technologie à la stack d'une application",
  })
  @ApiCreatedResponse({
    description: "Technologie ajoutée avec succès",
    type: TechnologyDto,
  })
  @ApiConflictResponse({
    description: "Cette technologie est déjà renseignée pour cette application",
    type: TechnologyErrorResponseDto,
  })
  @ApiParam({ name: "applicationId", description: "ID de l'application" })
  async create(
    @UserId() userId: string,
    @Param("applicationId") applicationId: string,
    @Body() dto: CreateTechnologyDto,
  ) {
    return this.technologyService.createTechnology(applicationId, dto, {
      applicationId,
      metadata: {
        userId,
        gender: "de la technologie",
        getColumn: () => dto.technology,
        entity: "technologyStackId",
        fields: TECHNOLOGY_METADATA_FIELDS,
      },
    });
  }

  @Patch(":id")
  @RequiredPermissions([Permission.AppWrite])
  @HttpCode(200)
  @ApiOperation({
    summary: "Mettre à jour une technologie",
  })
  @ApiOkResponse({
    description: "Technologie mise à jour avec succès",
    type: TechnologyDto,
  })
  @ApiParam({ name: "applicationId", description: "ID de l'application" })
  @ApiParam({ name: "id", description: "ID de la technologie" })
  async update(
    @Param("applicationId") applicationId: string,
    @UserId() userId: string,
    @Param("id") id: string,
    @Body() dto: CreateTechnologyDto,
  ) {
    return this.technologyService.updateTechnology(id, applicationId, dto, {
      applicationId,
      metadata: {
        userId,
        gender: "de la technologie",
        getColumn: () => dto.technology,
        entity: "technologyStackId",
        fields: TECHNOLOGY_METADATA_FIELDS,
      },
    });
  }

  @Delete(":id")
  @RequiredPermissions([Permission.AppWrite])
  @HttpCode(204)
  @ApiOperation({
    summary: "Supprimer une technologie",
  })
  @ApiNoContentResponse({
    description: "Technologie supprimée",
  })
  @ApiParam({ name: "applicationId", description: "ID de l'application" })
  @ApiParam({ name: "id", description: "ID de la technologie" })
  async delete(
    @UserId() userId: string,
    @Param("applicationId") applicationId: string,
    @Param("id") id: string,
  ) {
    await this.technologyService.deleteTechnology(id, applicationId, {
      applicationId,
      metadata: {
        userId,
        gender: "de la technologie",
        getColumn: (entity) => entity.technology,
        entity: "technologyStackId",
        fields: TECHNOLOGY_METADATA_FIELDS,
      },
    });
  }
}
