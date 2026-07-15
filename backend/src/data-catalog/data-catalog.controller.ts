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
  DataDescriptionFiltersDto,
} from "./dto/create-data-description.dto";
import {
  CreateDataApplicationDto,
  CreateDataExposureDto,
  DataApplicationDto,
  DataExposureDto,
} from "./dto/create-data-application.dto";
import { UserId } from "../common/decorators/user-id.decorator";
import { PaginatedResponseDto, PaginationDto } from "../common/dto";
import { PermissionGuard } from "../common/guards/permission.guard";
import { RequiredPermissions } from "../common/decorators/required-permissions.decorator";

@ApiTags("Data Catalog")
@ApiBearerAuth()
@UseGuards(PermissionGuard)
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
  findAllDescriptions(@Query() filters: DataDescriptionFiltersDto) {
    return this.dataCatalogService.findAllDescriptions(
      filters.page ?? 0,
      filters.pageSize ?? 15,
      filters.name,
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
      pagination.sortBy,
    );
  }

  @Post("applications/:applicationId")
  @ApiOperation({ summary: "Rattacher une donnée à une application" })
  @ApiCreatedResponse({ type: DataApplicationDto })
  @RequiredPermissions([Permission.DataWrite])
  createApplicationData(
    @Param("applicationId") applicationId: string,
    @Body() dto: CreateDataApplicationDto,
    @UserId() userId: string,
  ) {
    return this.dataCatalogService.createApplicationData(
      applicationId,
      dto,
      userId,
    );
  }

  @Patch("applications/:applicationId/:dataApplicationId")
  @ApiOperation({ summary: "Mettre à jour une donnée applicative" })
  @ApiBody({ type: CreateDataApplicationDto })
  @ApiOkResponse({ type: DataApplicationDto })
  @RequiredPermissions([Permission.DataWrite])
  updateApplicationData(
    @Param("applicationId") applicationId: string,
    @Param("dataApplicationId") dataApplicationId: string,
    @Body() dto: Partial<CreateDataApplicationDto>,
    @UserId() userId: string,
  ) {
    return this.dataCatalogService.updateApplicationData(
      applicationId,
      dataApplicationId,
      dto,
      userId,
    );
  }

  @Delete("applications/:applicationId/:dataApplicationId")
  @HttpCode(204)
  @ApiOperation({ summary: "Détacher une donnée d'une application" })
  @ApiNoContentResponse({
    description: "Data application deleted successfully",
  })
  @RequiredPermissions([Permission.DataWrite])
  deleteApplicationData(
    @Param("applicationId") applicationId: string,
    @Param("dataApplicationId") dataApplicationId: string,
    @UserId() userId: string,
  ) {
    return this.dataCatalogService.deleteApplicationData(
      applicationId,
      dataApplicationId,
      userId,
    );
  }

  // =====================================================
  // DATA EXPOSURES
  // =====================================================

  @Post("applications/:applicationId/:dataApplicationId/exposures")
  @ApiOperation({ summary: "Ajouter une exposition à une donnée applicative" })
  @ApiCreatedResponse({ type: DataExposureDto })
  @RequiredPermissions([Permission.DataWrite])
  createExposure(
    @Param("applicationId") applicationId: string,
    @Param("dataApplicationId") dataApplicationId: string,
    @Body() dto: CreateDataExposureDto,
    @UserId() userId: string,
  ) {
    return this.dataCatalogService.createExposure(
      applicationId,
      dataApplicationId,
      dto,
      userId,
    );
  }

  @Patch("applications/:applicationId/:dataApplicationId/exposures/:exposureId")
  @ApiOperation({ summary: "Mettre à jour une exposition" })
  @ApiBody({ type: CreateDataExposureDto })
  @ApiOkResponse({ type: DataExposureDto })
  @RequiredPermissions([Permission.DataWrite])
  updateExposure(
    @Param("applicationId") applicationId: string,
    @Param("dataApplicationId") dataApplicationId: string,
    @Param("exposureId") exposureId: string,
    @Body() dto: Partial<CreateDataExposureDto>,
    @UserId() userId: string,
  ) {
    return this.dataCatalogService.updateExposure(
      applicationId,
      dataApplicationId,
      exposureId,
      dto,
      userId,
    );
  }

  @Delete(
    "applications/:applicationId/:dataApplicationId/exposures/:exposureId",
  )
  @HttpCode(204)
  @ApiOperation({ summary: "Supprimer une exposition" })
  @ApiNoContentResponse({ description: "Exposure deleted successfully" })
  @RequiredPermissions([Permission.DataWrite])
  deleteExposure(
    @Param("applicationId") applicationId: string,
    @Param("dataApplicationId") dataApplicationId: string,
    @Param("exposureId") exposureId: string,
    @UserId() userId: string,
  ) {
    return this.dataCatalogService.deleteExposure(
      applicationId,
      dataApplicationId,
      exposureId,
      userId,
    );
  }
}
