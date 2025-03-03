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
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import {
  CreateOrganizationDto,
  PatchOrganizationDto,
} from './dto/organization.dto';
import { Organization } from '@prisma/client';

/**
 * Controller la gestion des organisations
 * Permet de créer, mettre à jour,
 */
@ApiTags('organizations')
@Controller('organizations')
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
    summary: 'Créer une nouvelle organisation',
    description: `
**Ce endpoint permet de créer une organisation complète**

Vous devez fournir les informations suivantes :
- **label**: Le libellé de l'organisation
- **url**: L'url de l'organisation
- **sigle**: Le sigle de l'organisation
- **parentId**: L'identifiant de l'organisation parente
    `,
  })
  @ApiResponse({ status: 201, description: 'Organisation Créée avec succes' })
  public async create(
    @Body() CreateOrganizationDto: CreateOrganizationDto,
    @Request() req,
  ) {
    Logger.log({
      message: "Début de la création de l'organisation",
      userId: req.user.keycloakId,
      action: 'create',
    });

    return await this.organizationService.createOrganization(
      CreateOrganizationDto,
    );
  }

  /**
   * Récupère une organisation spécifique par son ID
   *
   * @param id L'identifiant de l'organisation à récupérer
   *
   * @returns L'organisation correspondant à l'ID spécifié
   * @throws NotFoundException Si l'organisation n'est pas trouvée
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Récupérer une organisation spécifique par ID',
    description: `
Ce endpoint permet de récupérer les détails complets d'une organisation en fonction de son identifiant unique.
  
Le paramètre **id** doit être fourni dans l'URL
    `,
  })
  public async findOne(@Param('id') id: string): Promise<Organization> {
    try {
      return await this.organizationService.getOrganizationById(id);
    } catch {
      throw new NotFoundException('Organisation non trouvé');
    }
  }

  /**
   * Récupère toutes les organisations
   *
   * @returns La liste de toutes les organisations
   *
   */
  @Get()
  @ApiOperation({
    summary: 'Récupérer les organisations',
    description: `
Ce endpoint permet de récupérer la liste de toutes les organisations existantes dans le système

Aucun paramètre n'est requis pour accéder à cette liste
    `,
  })
  @ApiResponse({ status: 200, description: 'Liste des organisations' })
  public async findAll(): Promise<Organization[]> {
    return await this.organizationService.getOrganizations();
  }

  /**
   * Met à jour les informations d'une organisation
   *
   * @param id L'identifiant de l'organisation à mettre à jour
   * @param organizationToUpdate Les nouvelles données de l'organisation à mettre à jour
   *
   * @returns L'organisation mise à jour
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Mettre à jour une organisation',
    description: `
Ce endpoint permet de mettre à jour une organisation existante
Vous devez fournir l'identifiant de l'organisation dans l'URL et les nouvelles données dans le corps de la requête
Les données de mise à jour doivent correspondre aux champs
    `,
  })
  public async udate(
    @Param('id') id: string,
    @Body() organisationToUpdate: PatchOrganizationDto,
  ): Promise<PatchOrganizationDto> {
    Logger.log({
      message: "Début de la modification de l'organisation",
      organisationToUpdate: organisationToUpdate,
      action: 'patch',
    });

    return this.organizationService.updateOrganization({
      where: { id: id },
      data: organisationToUpdate,
    });
  }

  /**
   * Supprime une organisation
   *
   * @param id L'identifiant de l'organisation à supprimer
   *
   * @returns L'organisation supprimée
   * @throws NotFoundException Si l'organisation à supprimer n'est pas trouvée
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Supprimer une organisation',
    description: `
Ce endpoint permet de supprimer une organisation existante
Vous devez fournir l'identifiant de l'organisation dans l'URL
    `,
  })
  public async delete(@Param('id') id: string) {
    return await this.organizationService.deleteOrganization(id);
  }
}
