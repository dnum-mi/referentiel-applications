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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
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
  OrganizationScopedAdminDto,
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
  // Écritures réservées à l'admin global : le périmètre d'un utilisateur scopé est relu à chaque
  // requête via le `path` de son organisation de scope — la créer, la renommer ou la déplacer
  // élargirait ce périmètre.
  @Post()
  @RequiredPermissions([Permission.GlobalAdminManage])
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
  @ApiCreatedResponse({
    description: "Organisation Créée avec succes",
    type: OrganizationDto,
  })
  @ApiForbiddenResponse({
    description: "Réservé aux administrateurs globaux.",
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
   * Liste les administrateurs dont le périmètre est cette organisation. Sert à prévenir l'admin
   * global avant une suppression : la FK `ON DELETE SET NULL` leur retirerait leur périmètre et en
   * ferait des administrateurs globaux.
   */
  @Get("/:id/scoped-admins")
  @RequiredPermissions([Permission.GlobalAdminManage])
  @ApiOperation({
    summary:
      "Lister les administrateurs ayant cette organisation pour périmètre",
  })
  @ApiOkResponse({
    description: "Administrateurs scopés sur l'organisation",
    type: [OrganizationScopedAdminDto],
  })
  @ApiNotFoundResponse({ description: "Organisation non trouvée" })
  public async findScopedAdmins(
    @Param("id") id: string,
  ): Promise<OrganizationScopedAdminDto[]> {
    return this.organizationService.findScopedAdmins(id);
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
      "Ce endpoint permet de récupérer les détails complets d'une organisation en fonction de son identifiant unique.",
  })
  @ApiOkResponse({
    description: "Organisation trouvée",
    type: OrganizationDto,
  })
  @ApiNotFoundResponse({ description: "Organisation non trouvée" })
  public async findOne(@Param("id") id: string): Promise<Organization> {
    return await this.organizationService.findOneWithReferences(id);
  }

  @Get()
  @ApiOperation({
    summary: "Récupérer toutes les organisations",
    description:
      "Ce endpoint permet de récupérer la liste de toutes les organisations.",
  })
  @ApiOkResponse({
    description: "Liste des organisations",
    type: PaginatedResponseDto.of(OrganizationDto),
  })
  public async findAll(@Query() filters: OrganizationFilterDto) {
    return this.organizationService.find(filters);
  }

  @Patch("/:id")
  @RequiredPermissions([Permission.GlobalAdminManage])
  @ApiOperation({
    summary: "Mettre à jour une organisation",
  })
  @ApiOkResponse({
    description: "Organisation mise à jour",
    type: OrganizationDto,
  })
  @ApiForbiddenResponse({
    description: "Réservé aux administrateurs globaux.",
  })
  public async update(
    @Param("id") id: string,
    @Body() data: PatchOrganizationDto,
  ): Promise<PatchOrganizationDto> {
    return await this.organizationService.update(id, data);
  }

  // Réservé à l'admin global : supprimer l'organisation de périmètre d'un utilisateur
  // scopé remet son `scopeOrganizationId` à NULL (FK `ON DELETE SET NULL`), ce qui le rendrait
  // non scopé — un admin scopé pourrait ainsi s'élever en admin global.
  @Delete("/:id")
  @RequiredPermissions([Permission.GlobalAdminManage])
  @ApiOperation({ summary: "Supprimer une organisation" })
  @HttpCode(204)
  @ApiNoContentResponse({
    description: "Organisation supprimée",
  })
  @ApiForbiddenResponse({
    description: "Réservé aux administrateurs globaux.",
  })
  @ApiConflictResponse({
    description:
      "L'organisation possède des organisations filles : suppression refusée.",
  })
  public async delete(@Param("id") id: string) {
    return this.organizationService.deleteSafe(id);
  }
}
