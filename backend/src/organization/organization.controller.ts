import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Request,
  Logger,
  Param,
  Query,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from "@nestjs/swagger";
import { OrganizationService } from "./organization.service";
import {
  CreateOrganizationDto,
  PatchOrganizationDto,
} from "./dto/organization.dto";
import { Organization } from "@prisma/client";
import { OrganizationFilterDto } from "./dto/filters.dto";

/**
 * Controller la gestion des organisations
 * Permet de créer, mettre à jour,
 */
@ApiTags("organizations")
@Controller("organizations")
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

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
  @ApiBody({ type: CreateOrganizationDto })
  @ApiOperation({
    summary: "Créer une nouvelle organisation",
    description: `
**Ce endpoint permet de créer une organisation complète**

Vous devez fournir les informations suivantes :
- **label**: Le libellé de l'organisation
- **url**: L'url de l'organisation
- **sigle**: Le sigle de l'organisation
- **parentId**: L'identifiant de l'organisation parente
    `,
  })
  @ApiResponse({ status: 201, description: "Organisation Créée avec succes" })
  public async create(
    @Body() CreateOrganizationDto: CreateOrganizationDto,
    @Request() req,
  ) {
    Logger.log({
      message: "Début de la création de l'organisation",
      userId: req.user.keycloakId,
      action: "create",
    });

    return await this.organizationService.create(CreateOrganizationDto);
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
    description: "Ce endpoint permet de récupérer les détails complets d'une organisation en fonction de son identifiant unique.",
  })
  public async findOne(@Param("id") id: string): Promise<Organization> {
    return this.organizationService.findOne(id);
  }

  @Get()
  @ApiResponse({ status: 200, description: "Liste les organisations" })
  public async findAll(
    @Query() filters: OrganizationFilterDto,
  ): Promise<Record<string, Organization>> {
    return this.organizationService.findMultiple({
      ids: filters.ids ? filters.ids.split(",") : [],
      withAncestors: filters.withAncestors === "true",
      withChildren: filters.withChildren === "true",
      search: filters.search,
    });
  }

  @Patch("/:id")
  @ApiOperation({
    summary: "Mettre à jour une organisation",
  })
  public async update(
    @Param("id") id: string,
    @Body() data: PatchOrganizationDto,
  ): Promise<PatchOrganizationDto> {
    return await this.organizationService.update(id, data);
  }

  @Delete("/:id")
  @ApiOperation({ summary: "Supprimer une organisation" })
  public async delete(@Param("id") id: string) {
    return this.organizationService.deleteSafe(id);
  }
}
