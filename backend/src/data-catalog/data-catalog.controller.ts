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
  ApiNotFoundResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Permission } from "@prisma/client";

import { DataCatalogService } from "./data-catalog.service";
import {
  CreateDataDescriptionDto,
  DataDescriptionDto,
} from "./dto/create-data-description.dto";
import { DataApplicationDto } from "./dto/create-data-application.dto";
import { UserId } from "../common/decorators/user-id.decorator";
import { PaginatedResponseDto, PaginationDto } from "../common/dto";
import { PermissionGuard } from "../common/guards/permission.guard";
import { FeatureFlag } from "../common/decorators/feature-flag.decorator";
import { FeatureFlagGuard } from "../feature-flag/feature-flag.guard";
import { FeatureFlagKey } from "../feature-flag/feature-flag.keys";
import { RequiredPermissions } from "../common/decorators/required-permissions.decorator";

@ApiTags("Data Catalog")
@ApiBearerAuth()
@FeatureFlag(FeatureFlagKey.DATA_CATALOG)
@UseGuards(PermissionGuard, FeatureFlagGuard)
@ApiNotFoundResponse({ description: "Ressource non trouvée" })
@Controller("data-catalog")
export class DataCatalogController {
  constructor(private readonly dataCatalogService: DataCatalogService) {}

  // =====================================================
  // DATA DESCRIPTIONS
  // =====================================================

  @Post("descriptions")
  @ApiOperation({ summary: "Créer une data description" })
  @ApiCreatedResponse({ type: DataDescriptionDto })
  @RequiredPermissions([Permission.DataWrite])
  createDescription(
    @Body() dto: CreateDataDescriptionDto,
    @UserId() userId: string,
  ) {
    return this.dataCatalogService.createDescription(dto, userId);
  }

  @Get("descriptions")
  @ApiOperation({ summary: "Lister les data descriptions" })
  @ApiOkResponse({ type: [DataDescriptionDto] })
  @RequiredPermissions([Permission.DataRead])
  findAllDescriptions(@Query() pagination: PaginationDto) {
    return this.dataCatalogService.findAllDescriptions(
      pagination.page ?? 0,
      pagination.pageSize ?? 15,
    );
  }

  @Patch("descriptions/:id")
  @ApiOperation({ summary: "Mettre à jour une data description" })
  @ApiBody({ type: CreateDataDescriptionDto })
  @ApiOkResponse({ type: DataDescriptionDto })
  @RequiredPermissions([Permission.DataWrite])
  updateDescription(
    @Param("id") id: string,
    @Body() dto: Partial<CreateDataDescriptionDto>,
    @UserId() userId: string,
  ) {
    return this.dataCatalogService.updateDescription(id, dto, userId);
  }

  @Delete("descriptions/:id")
  @HttpCode(204)
  @ApiOperation({ summary: "Supprimer une data description" })
  @RequiredPermissions([Permission.DataWrite])
  @ApiNoContentResponse({
    description: "Data description deleted successfully",
  })
  deleteDescription(@Param("id") id: string, @UserId() userId: string) {
    return this.dataCatalogService.deleteDescription(id, userId);
  }

  // =====================================================
  // APPLICATION DATA
  // =====================================================

  @Get("applications/:applicationId/:dataApplicationId")
  @ApiOperation({ summary: "Détail d'une donnée dans une application" })
  @ApiOkResponse({ type: DataApplicationDto })
  @RequiredPermissions([Permission.DataRead])
  async findOneApplicationData(
    @Param("applicationId") applicationId: string,
    @Param("dataApplicationId") dataApplicationId: string,
  ) {
    return this.dataCatalogService.findOneApplicationData(
      applicationId,
      dataApplicationId,
    );
  }

  @Get("applications/:applicationId")
  @ApiOperation({ summary: "Lister les données d'une application" })
  @ApiOkResponse({ type: PaginatedResponseDto.of(DataApplicationDto) })
  @RequiredPermissions([Permission.DataRead])
  findByApplication(
    @Param("applicationId") applicationId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.dataCatalogService.findByApplication(
      applicationId,
      pagination.page ?? 0,
      pagination.pageSize ?? 15,
      pagination.order,
    );
  }
}
