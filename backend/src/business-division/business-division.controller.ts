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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { Permission } from "@prisma/client";
import { RequiredPermissions } from "src/common/decorators/required-permissions.decorator";
import { PaginatedResponseDto } from "src/common/dto";
import { PermissionGuard } from "src/common/guards/permission.guard";
import { BusinessDivisionService } from "./business-division.service";
import {
  BusinessDivisionDTO,
  BusinessDivisionFiltersDto,
  CreateBusinessDivisionDto,
  UpdateBusinessDivisionDto,
} from "./dto/business-division.dto";

@ApiTags("Business Division")
@UseGuards(PermissionGuard)
@Controller("business-division")
export class BusinessDivisionController {
  constructor(
    private readonly businessDivisionService: BusinessDivisionService,
  ) {}

  @Get()
  @RequiredPermissions([Permission.AppRead])
  @ApiOperation({
    summary: "Rechercher des Business division.",
    description: `
    Cette route permet de rechercher selon les paramètres fournis :
  
    - Retourne une liste paginée ou non de business division.
    - Filtrage possible par nom.
    - Tri possible par :
      - \`label\`
    - Ordre : \`asc\` ou \`desc\`.
  `,
  })
  @ApiOkResponse({
    description: "Liste des tags trouvés",
    type: PaginatedResponseDto.of(BusinessDivisionDTO),
  })
  async findAll(@Query() filters: BusinessDivisionFiltersDto) {
    return await this.businessDivisionService.search(filters);
  }

  @Post()
  @RequiredPermissions([Permission.GlobalAdminManage])
  @ApiOperation({
    summary: "Créer une direction métier.",
    description: `
Ce endpoint permet de créer une nouvelle direction métier (business division).

Information requise :
- **label** : nom unique de la direction métier
    `,
  })
  @HttpCode(201)
  @ApiCreatedResponse({
    description: "Direction métier créée avec succès",
    type: BusinessDivisionDTO,
  })
  @ApiForbiddenResponse({
    description: "Accès refusé - Privilège admin requis",
  })
  @ApiConflictResponse({
    description: "Une direction métier existe déjà avec ce nom",
  })
  async create(@Body() createBusinessDivisionDto: CreateBusinessDivisionDto) {
    return await this.businessDivisionService.createDivision(
      createBusinessDivisionDto,
    );
  }

  @Patch(":id")
  @RequiredPermissions([Permission.GlobalAdminManage])
  @ApiOperation({ summary: "Modifier une direction métier" })
  @ApiOkResponse({
    description: "Direction métier mise à jour avec succès",
    type: BusinessDivisionDTO,
  })
  @ApiForbiddenResponse({
    description: "Accès refusé - Privilège admin requis",
  })
  @ApiNotFoundResponse({ description: "Direction métier non trouvée" })
  @ApiConflictResponse({
    description: "Une direction métier existe déjà avec ce nom",
  })
  @ApiParam({ name: "id", description: "ID de la direction métier à modifier" })
  async update(
    @Param("id") id: string,
    @Body() updateBusinessDivisionDto: UpdateBusinessDivisionDto,
  ) {
    return await this.businessDivisionService.updateDivision(
      id,
      updateBusinessDivisionDto,
    );
  }

  @Delete(":id")
  @RequiredPermissions([Permission.GlobalAdminManage])
  @ApiOperation({ summary: "Supprimer une direction métier" })
  @HttpCode(204)
  @ApiNoContentResponse({
    description: "Direction métier supprimée avec succès",
  })
  @ApiForbiddenResponse({
    description: "Accès refusé - Privilège admin requis",
  })
  @ApiNotFoundResponse({ description: "Direction métier non trouvée" })
  @ApiParam({
    name: "id",
    description: "ID de la direction métier à supprimer",
  })
  async remove(@Param("id") id: string) {
    return await this.businessDivisionService.delete(id);
  }

  @Get(":id")
  @RequiredPermissions([Permission.AppRead])
  @ApiOperation({
    summary: "Rechercher un Business division par id.",
  })
  @ApiOkResponse({
    description: "Business division",
    type: BusinessDivisionDTO,
  })
  @ApiNotFoundResponse({ description: "Business Division non trouvé" })
  @ApiParam({ name: "id", description: "ID du Business Division à trouver" })
  async findById(@Param("id") id: string) {
    return await this.businessDivisionService.findById(id);
  }
}
