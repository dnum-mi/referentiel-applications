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
import { DataFamilyDto } from "../dto/create-data-description.dto";
import { DataFamilyService } from "./data-family.service";
import {
  CreateDataFamilyDto,
  DataFamilyFiltersDto,
  UpdateDataFamilyDto,
} from "./dto/data-family.dto";

@ApiTags("Data Catalog")
@ApiBearerAuth()
@UseGuards(PermissionGuard)
@Controller("data-catalog/families")
export class DataFamilyController {
  constructor(private readonly dataFamilyService: DataFamilyService) {}

  @Post()
  @ApiOperation({ summary: "Créer une famille de données" })
  @ApiCreatedResponse({ type: DataFamilyDto })
  @RequiredPermissions([Permission.DataWrite])
  create(@Body() dto: CreateDataFamilyDto) {
    return this.dataFamilyService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: "Lister les familles de données" })
  @ApiOkResponse({ type: PaginatedResponseDto.of(DataFamilyDto) })
  @RequiredPermissions([Permission.DataRead])
  findAll(@Query() filters: DataFamilyFiltersDto) {
    return this.dataFamilyService.findAllFamilies(filters);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Mettre à jour une famille de données" })
  @ApiOkResponse({ type: DataFamilyDto })
  @ApiNotFoundResponse({ description: "Famille non trouvée" })
  @RequiredPermissions([Permission.DataWrite])
  update(@Param("id") id: string, @Body() dto: UpdateDataFamilyDto) {
    return this.dataFamilyService.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  @ApiOperation({ summary: "Supprimer une famille de données" })
  @ApiNoContentResponse({ description: "Famille supprimée avec succès" })
  @ApiNotFoundResponse({ description: "Famille non trouvée" })
  @RequiredPermissions([Permission.DataWrite])
  remove(@Param("id") id: string) {
    return this.dataFamilyService.delete(id);
  }
}
