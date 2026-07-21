import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { Permission } from "@prisma/client";
import { RequiredPermissions } from "src/common/decorators/required-permissions.decorator";
import { PermissionGuard } from "src/common/guards/permission.guard";
import { FeatureFlag } from "src/common/decorators/feature-flag.decorator";
import { FeatureFlagGuard } from "src/feature-flag/feature-flag.guard";
import { FeatureFlagKey } from "src/feature-flag/feature-flag.keys";
import {
  FirstLastMetadataDto,
  MetadataDto,
  MetadataFiltersDto,
} from "./dto/metadata.dto";
import { MetadatasService } from "./metadatas.service";
import { PaginatedResponseDto } from "src/common/dto/paginated-response.dto";

@ApiTags("Metadatas")
@FeatureFlag(FeatureFlagKey.APPLICATION_HISTORY)
@UseGuards(FeatureFlagGuard)
@ApiNotFoundResponse({ description: "Ressource non trouvée" })
@Controller("metadatas")
export class MetadatasController {
  constructor(private readonly metadataService: MetadatasService) {}

  @Get()
  @ApiOperation({ summary: "Récupérer toutes les metadatas" })
  @ApiOkResponse({
    description: "Récupérer toutes les metadatas",
    type: PaginatedResponseDto.of(MetadataDto),
  })
  find(@Query() filters: MetadataFiltersDto) {
    return this.metadataService.find(filters);
  }

  @Get(":id")
  @ApiOperation({ summary: "Récupérer une metadata par son ID" })
  @ApiParam({ name: "id", description: "ID de la metadata" })
  @ApiOkResponse({
    description: "Détails de la metadata",
    type: MetadataDto,
  })
  findOne(@Param("id") id: string) {
    return this.metadataService.findOne(id, {
      application: true,
      createdBy: true,
    });
  }
}

@ApiTags("Metadatas")
@FeatureFlag(FeatureFlagKey.APPLICATION_HISTORY)
@UseGuards(PermissionGuard, FeatureFlagGuard)
@ApiNotFoundResponse({ description: "Ressource non trouvée" })
@Controller("applications/:applicationId/metadatas")
export class ApplicationMetadatasController {
  constructor(private readonly metadataService: MetadatasService) {}

  @Get()
  @RequiredPermissions([Permission.MetadataRead])
  @ApiOperation({ summary: "Récupérer toutes les metadatas d'une application" })
  @ApiParam({ name: "applicationId", description: "ID de l'application" })
  @ApiOkResponse({
    description: "Liste des metadatas",
    type: PaginatedResponseDto.of(MetadataDto),
  })
  find(
    @Param("applicationId") applicationId: string,
    @Query() filters: MetadataFiltersDto,
  ) {
    return this.metadataService.find({ ...filters, applicationId });
  }

  @Get("first-last")
  @UseGuards(PermissionGuard)
  @RequiredPermissions([Permission.MetadataRead])
  @ApiOperation({
    summary: "Retourne la première et la dernière metadata d'une application",
  })
  @ApiParam({ name: "applicationId", description: "ID de l'application" })
  @ApiOkResponse({
    description: "La première et la dernière metadata",
    type: FirstLastMetadataDto,
  })
  getFirstAndLastMetadata(
    @Param("applicationId") applicationId: string,
  ): Promise<FirstLastMetadataDto> {
    return this.metadataService.getFirstAndLastMetadata(applicationId);
  }
}
