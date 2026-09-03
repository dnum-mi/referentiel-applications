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
  EolProductDto,
  TechnologyDto,
  TechnologyErrorResponseDto,
} from "./dto/technology.dto";
import { TechnologyService } from "./technology.service";

// Champs comparés avant/après par MetadatasService pour l'onglet Modifications. La fin de
// vie et son origine en font partie (#2454) : une saisie ou un effacement manuel doit se
// lire dans l'historique comme un changement de version. Les recalculs automatiques
// (lecture paresseuse, cron) écrivent hors de ce circuit et n'y apparaissent donc pas ;
// seul le recalcul déclenché par une modification humaine du produit ou de la version y
// figure, à côté du champ qui l'a provoqué.
const TECHNOLOGY_METADATA_FIELDS = {
  technology: "technologie",
  product: "produit",
  version: "version",
  docUrl: "lien documentaire",
  eolDate: "fin de vie",
  eolSource: "origine de la fin de vie",
};

@ApiTags("Technologies")
@ApiExtraModels(TechnologyErrorResponseDto)
@UseGuards(PermissionGuard)
@Controller("applications/:applicationId/technologies")
export class TechnologyController {
  constructor(private readonly technologyService: TechnologyService) {}

  @Get()
  @RequiredPermissions([Permission.TechnologyRead])
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

  @Get("eol-products")
  @RequiredPermissions([Permission.TechnologyRead])
  @ApiOperation({
    summary:
      "Lister les produits suivis par endoflife.date (autocomplétion de la saisie produit)",
  })
  @ApiOkResponse({
    description:
      "Catalogue des produits endoflife.date (vide si le catalogue est indisponible)",
    type: [EolProductDto],
  })
  @ApiParam({ name: "applicationId", description: "ID de l'application" })
  async listEolProducts() {
    return this.technologyService.listEolProducts();
  }

  @Post()
  @RequiredPermissions([Permission.TechnologyWrite])
  @ApiOperation({
    summary:
      "Ajouter une technologie à la stack d'une application (met à jour la ligne existante si le couple technologie/produit est déjà renseigné, sans tenir compte de la casse)",
  })
  @ApiCreatedResponse({
    description: "Technologie ajoutée ou mise à jour avec succès",
    type: TechnologyDto,
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
  @RequiredPermissions([Permission.TechnologyWrite])
  @HttpCode(200)
  @ApiOperation({
    summary: "Mettre à jour une technologie",
  })
  @ApiOkResponse({
    description: "Technologie mise à jour avec succès",
    type: TechnologyDto,
  })
  @ApiConflictResponse({
    description: "Cette technologie est déjà renseignée pour cette application",
    type: TechnologyErrorResponseDto,
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
  @RequiredPermissions([Permission.TechnologyWrite])
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
