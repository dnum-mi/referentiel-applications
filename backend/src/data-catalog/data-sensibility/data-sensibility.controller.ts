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
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Permission } from "@prisma/client";
import { RequiredPermissions } from "src/common/decorators/required-permissions.decorator";
import { PaginatedResponseDto } from "src/common/dto";
import { PermissionGuard } from "src/common/guards/permission.guard";
import { DataSensibilityDto } from "../dto/create-data-application.dto";
import { DataSensibilityService } from "./data-sensibility.service";
import {
  CreateDataSensibilityDto,
  DataSensibilityFiltersDto,
  UpdateDataSensibilityDto,
} from "./dto/data-sensibility.dto";

@ApiTags("Data Catalog")
@ApiBearerAuth()
@UseGuards(PermissionGuard)
@Controller("data-catalog/sensibilities")
export class DataSensibilityController {
  constructor(
    private readonly dataSensibilityService: DataSensibilityService,
  ) {}

  @Post()
  @ApiOperation({ summary: "Créer un niveau de sensibilité" })
  @ApiCreatedResponse({ type: DataSensibilityDto })
  @RequiredPermissions([Permission.DataWrite])
  create(@Body() dto: CreateDataSensibilityDto) {
    return this.dataSensibilityService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: "Lister les niveaux de sensibilité" })
  @ApiOkResponse({ type: PaginatedResponseDto.of(DataSensibilityDto) })
  @RequiredPermissions([Permission.DataRead])
  findAll(@Query() filters: DataSensibilityFiltersDto) {
    return this.dataSensibilityService.findAllSensibilities(filters);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Mettre à jour un niveau de sensibilité" })
  @ApiOkResponse({ type: DataSensibilityDto })
  @ApiNotFoundResponse({ description: "Niveau de sensibilité non trouvé" })
  @RequiredPermissions([Permission.DataWrite])
  update(@Param("id") id: string, @Body() dto: UpdateDataSensibilityDto) {
    return this.dataSensibilityService.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  @ApiOperation({ summary: "Supprimer un niveau de sensibilité" })
  @ApiNoContentResponse({
    description: "Niveau de sensibilité supprimé avec succès",
  })
  @ApiNotFoundResponse({ description: "Niveau de sensibilité non trouvé" })
  @RequiredPermissions([Permission.DataWrite])
  remove(@Param("id") id: string) {
    return this.dataSensibilityService.delete(id);
  }
}
