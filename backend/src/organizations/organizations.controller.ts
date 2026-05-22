import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Organization, Permission } from "@prisma/client";
import { PaginatedResponseDto } from "src/common/dto";
import { OrganizationFilterDto } from "./dto/filters.dto";
import {
  CreateOrganizationDto,
  OrganizationDto,
  PatchOrganizationDto,
} from "./dto/organizations.dto";
import { OrganizationsService } from "./organizations.service";
import { PermissionGuard } from "src/common/guards/permission.guard";
import { RequiredPermissions } from "src/common/decorators/required-permissions.decorator";

/**
 * Controller la gestion des organisations
 * Permet de créer, mettre à jour,
 */
@ApiTags("organizations")
@UseGuards(PermissionGuard)
@Controller("organizations")
export class OrganizationsController {
  constructor(private readonly organizationService: OrganizationsService) {}

  /**
   * Crée une nouvelle organisation
   * Cette méthode permet de créer une organisation en utilisant les données fournies
   *
   * @param CreateOrganizationDto Les données nécessaires pour créer une nouvelle organisation
   * @param req La requête contenant  le token de l'utilisateur authentifié
   *
   * @returns La nouvelle organisation créée
   * @throws BadRequestException Si le token est invalide ou l'identifiant utilisateur est manquant
   */
  @Post()
  @RequiredPermissions([Permission.OrganizationManage])
  @ApiBody({ type: CreateOrganizationDto })
  @ApiOperation({
    summary: "Créer une nouvelle organisation",
    description: `
**Cet endpoint permet de créer une organisation complète**

Vous devez fournir les informations suivantes :
- **label**: Le libellé de l'organisation
- **url**: L'url de l'organisation
- **sigle**: Le sigle de l'organisation
- **parentId**: L'identifiant de l'organisation parente
    `,
  })
  @ApiCreatedResponse({
    status: 201,
    description: "Organisation créée avec succès",
    type: OrganizationDto,
  })
  public async create(
    @Body() createOrganizationDto: CreateOrganizationDto,
    @Request() req: { user: { id: string } },
  ) {
    Logger.log({
      message: "Début de la création de l'organisation",
      userId: req.user.id,
      action: "create",
    });

    return await this.organizationService.create(createOrganizationDto);
  }

  /**
   * Récupère une organisation spécifique par son ID
   *
   * @param id L'identifiant de l'organisation à récupérer
   *
   * @returns L'organisation correspondant à l'ID spécifié
   * @throws NotFoundException Si l'organisation n'est pas trouvée
   */
  @Get("/:id")
  @ApiOperation({
    summary: "Récupérer une organisation spécifique par ID",
    description:
      "Cet endpoint permet de récupérer les détails complets d'une organisation en fonction de son identifiant unique.",
  })
  @ApiOkResponse({
    status: 200,
    description: "Organisation trouvée",
    type: OrganizationDto,
  })
  @ApiNotFoundResponse({ description: "Organisation non trouvée" })
  public async findOne(@Param("id") id: string): Promise<Organization> {
    return await this.organizationService.findOne(id);
  }

  @Get()
  @ApiOperation({
    summary: "Récupérer toutes les organisations",
    description:
      "Cet endpoint permet de récupérer la liste de toutes les organisations.",
  })
  @ApiOkResponse({
    description: "Liste des organisations",
    type: PaginatedResponseDto.of(OrganizationDto),
  })
  public async findAll(@Query() filters: OrganizationFilterDto) {
    return this.organizationService.find(filters);
  }

  @Patch("/:id")
  @RequiredPermissions([Permission.OrganizationManage])
  @ApiOperation({
    summary: "Mettre à jour une organisation",
  })
  @ApiOkResponse({
    description: "Organisation mise à jour",
    type: OrganizationDto,
  })
  public async update(
    @Param("id") id: string,
    @Body() data: PatchOrganizationDto,
  ): Promise<PatchOrganizationDto> {
    return await this.organizationService.update(id, data);
  }

  @Delete("/:id")
  @RequiredPermissions([Permission.OrganizationManage])
  @ApiOperation({ summary: "Supprimer une organisation" })
  @HttpCode(204)
  @ApiNoContentResponse({
    status: 204,
    description: "Organisation supprimée",
  })
  public async delete(@Param("id") id: string) {
    return this.organizationService.deleteSafe(id);
  }
}
