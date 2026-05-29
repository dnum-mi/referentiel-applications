import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiConflictResponse,
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
import {
  CreateOrganizationMaiaReferenceDto,
  OrganizationMaiaReferenceDto,
  OrganizationMaiaReferenceFilterDto,
} from "./dto/organization-maia-references.dto";
import { OrganizationMaiaReferencesService } from "./organization-maia-references.service";

@ApiTags("organization-maia-references")
@UseGuards(PermissionGuard)
@Controller("organization-maia-references")
export class OrganizationMaiaReferencesController {
  constructor(
    private readonly organizationMaiaReferencesService: OrganizationMaiaReferencesService,
  ) {}

  @Post()
  @RequiredPermissions([Permission.OrganizationManage])
  @ApiOperation({
    summary: "Créer une référence MAIA vers une organisation",
  })
  @ApiCreatedResponse({
    description: "Référence créée",
    type: OrganizationMaiaReferenceDto,
  })
  @ApiNotFoundResponse({ description: "Organisation non trouvée" })
  @ApiConflictResponse({
    description: "La référence MAIA existe déjà",
  })
  async create(
    @Body() dto: CreateOrganizationMaiaReferenceDto,
  ): Promise<OrganizationMaiaReferenceDto> {
    return this.organizationMaiaReferencesService.createReference(dto);
  }

  @Get()
  @RequiredPermissions([Permission.OrganizationManage])
  @ApiOperation({
    summary: "Lister les références MAIA",
  })
  @ApiOkResponse({
    description: "Liste des références MAIA",
    type: PaginatedResponseDto.of(OrganizationMaiaReferenceDto),
  })
  async findAll(@Query() filters: OrganizationMaiaReferenceFilterDto) {
    return this.organizationMaiaReferencesService.findAllReferences(filters);
  }

  @Delete(":id")
  @RequiredPermissions([Permission.OrganizationManage])
  @HttpCode(204)
  @ApiOperation({
    summary: "Supprimer une référence MAIA",
  })
  @ApiNoContentResponse({
    description: "Référence supprimée",
  })
  async remove(@Param("id") id: string): Promise<void> {
    await this.organizationMaiaReferencesService.delete(id);
  }
}
