import { UserService } from '../user/user.service';
import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  Request,
  Get,
  Query,
  NotFoundException,
  BadRequestException,
  Response,
  Logger,
} from '@nestjs/common';
import { ApplicationService } from './application.service';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExcludeEndpoint,
  ApiBody,
} from '@nestjs/swagger';
import { ExportService } from './export.service';
import {
  CreateApplicationDto,
  PatchApplicationDto,
} from './application/dto/create-application.dto';
import { SearchApplicationDto } from './application/dto/search-application.dto';
import { GetApplicationDto } from './application/dto/get-application.dto';
import {
  ActorType,
  ComplianceStatus,
  ComplianceType,
  ExternalRessourceType,
  LifecycleStatus,
} from 'src/enum';

/**
 * Controller pour la gestion des applications.
 * Permet de créer, rechercher, mettre à jour, récupérer et exporter des applications.
 */
@ApiTags('applications')
@Controller('applications')
export class ApplicationController {
  applicationsService: ApplicationService;

  constructor(
    private readonly applicationService: ApplicationService,
    private readonly userService: UserService,
    private readonly exportService: ExportService,
  ) {}

  /**
   * Crée une nouvelle application.
   * Cette méthode permet de créer une application en utilisant les données fournies.
   * 
   * @param createApplicationDto Les données nécessaires pour créer une nouvelle application.
   * @param req La requête contenant le token de l'utilisateur authentifié.
   * 
   * @returns La nouvelle application créée.
   * @throws BadRequestException Si le token est invalide ou l'identifiant utilisateur est manquant.
   * 

   */
  @Post()
  @ApiBody({ type: CreateApplicationDto })
  @ApiOperation({
    summary: 'Créer une nouvelle application',
    description: `
**Ce endpoint permet de créer une application complète.**

Vous devez fournir les informations suivantes :
- **label**: Le libellé de l'application.
- **shortName**: Le nom court de l'application.
- **logo**: L'URL du logo (peut être vide).
- **description**: Une description détaillée de l'application.
- **purposes**: Les domaines d'activité (ex: finance, HR, operations).
- **tags**: Des tags pour catégoriser l'application.
- **parentId**: L'identifiant de l'application parente (ou null).
- **lifecycle**: Un objet définissant le cycle de vie avec les champs :
  - **status**: Le statut (Enum: ${Object.values(LifecycleStatus).join(', ')}).
  - **firstProductionDate**: Date de première mise en production.
  - **plannedDecommissioningDate**: Date prévue de déclassement.
- **actors**: La liste des acteurs associés avec :
  - **type**: Le type d'acteur (Enum: ${Object.values(ActorType).join(', ')}).
  - **email**: L'adresse email de l'acteur.
- **compliances**: La liste des conformités associées avec :
  - **type**: Le type de conformité (Enum: ${Object.values(ComplianceType).join(', ')}).
  - **name**: Le nom de la conformité.
  - **status**: Le statut (Enum: ${Object.values(ComplianceStatus).join(', ')}).
  - **validityStart**: Date de début de validité.
  - **validityEnd**: Date de fin de validité.
  - **scoreValue**: Valeur du score.
  - **scoreUnit**: Unité du score.
  - **notes**: Notes complémentaires.
- **externalRessources**: Les liens externes associés avec :
  - **link**: L'URL.
  - **description**: La description.
  - **type**: Le type de ressource (Enum: ${Object.values(ExternalRessourceType).join(', ')}).
    `,
  })
  @ApiResponse({ status: 201, description: 'Application créée avec succès.' })
  @ApiResponse({ status: 404, description: 'Metadata ou parent non trouvé.' })
  public async create(
    @Body() createApplicationDto: CreateApplicationDto,
    @Request() req,
  ) {
    const user = req.user;

    Logger.log({
      message: "Début de la création de l'application",
      userId: user.keycloakId,
      action: 'create',
    });
    const newApplication = await this.applicationService.createApplication(
      user.keycloakId,
      createApplicationDto,
    );
    return newApplication;
  }

  /**
   * Recherche des applications en fonction des critères fournis.
   *
   * @param searchParams Paramètres de recherche des applications.
   *
   * @returns La liste des applications qui correspondent aux critères.
   * @throws NotFoundException Si aucune application n'est trouvée.
   */
  @Get('search')
  @ApiOperation({ summary: 'Rechercher des applications' })
  @ApiResponse({
    status: 200,
    description:
      'Liste des applications correspondant aux critères de recherche.',
  })
  async searchApplications(@Query() searchParams: SearchApplicationDto) {
    const applications =
      await this.applicationService.searchApplications(searchParams);

    return applications;
  }

  /**
   * Exporte les applications sous format CSV.
   *
   * @param query Les critères de recherche pour filtrer les applications à exporter.
   * @param res La réponse HTTP utilisée pour envoyer le fichier CSV.
   *
   * @throws BadRequestException Si une erreur se produit lors de l'exportation.
   *
   * @operation { GET } /applications/export
   */
  @Get('export')
  @ApiOperation({ summary: 'Exporter les applications' })
  @ApiResponse({ status: 200, description: 'Export réalisé avec succès.' })
  @ApiResponse({ status: 400, description: "Erreur lors de l'exportation." })
  @ApiExcludeEndpoint()
  async exportApplications(
    @Query() query: SearchApplicationDto,
    @Response() res,
  ) {
    try {
      const applications =
        await this.applicationService.searchApplications(query);

      const headers = ['id', 'label', 'description', 'createdBy', 'createdAt'];
      const data = applications.map((app) => ({
        id: app.id,
        label: app.label,
        description: app.description || '',
        createdBy: app.metadata?.createdById || '',
        createdAt: app.metadata?.createdAt?.toISOString() || '',
      }));

      const csvContent = this.exportService.generateCsv(data, headers);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="applications.csv"',
      );
      res.status(200).send(csvContent);
    } catch (error) {
      throw new BadRequestException("Erreur lors de l'exportation.");
    }
  }

  /**
   * Récupère une application spécifique par son ID.
   *
   * @param id L'identifiant de l'application à récupérer.
   *
   * @returns L'application correspondant à l'ID spécifié.
   * @throws NotFoundException Si l'application n'est pas trouvée.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Récupérer une application spécifique par ID',
    description: `
Ce endpoint permet de récupérer les détails complets d'une application en fonction de son identifiant unique.

Le paramètre **id** doit être fourni dans l'URL.
    `,
  })
  async findOne(@Param('id') id: string): Promise<GetApplicationDto> {
    try {
      const application = await this.applicationService.getApplicationById(id);

      return application;
    } catch (error) {
      throw new NotFoundException('Application non trouvée');
    }
  }

  /**
   * Récupère toutes les applications.
   *
   * @returns La liste de toutes les applications.
   *
   * @operation { GET } /applications
   * @ApiOperation({ summary: 'Récupérer les applications' })
   * @ApiResponse({ status: 200, description: 'Liste des applications' })
   */
  @Get()
  @ApiOperation({
    summary: 'Récupérer les applications',
    description: `
Ce endpoint permet de récupérer la liste de toutes les applications existantes dans le système.

Aucun paramètre n'est requis pour accéder à cette liste.
    `,
  })
  @ApiResponse({ status: 200, description: 'Liste des applications' })
  async findAll() {
    return await this.applicationService.getApplications();
  }

  /**
   * Met à jour les informations d'une application.
   *
   * @param id L'identifiant de l'application à mettre à jour.
   * @param applicationToUpdate Les nouvelles données de l'application à mettre à jour.
   *
   * @returns L'application mise à jour.
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Mettre à jour une application',
    description: ` Ce endpoint permet de mettre à jour une application existante. 
    Vous devez fournir l'identifiant de l'application dans l'URL et les nouvelles données dans le corps de la requête. Les données de mise à jour doivent correspondre aux champs.
    `,
  })
  async update(
    @Param('id') id: string,
    @Body() applicationToUpdate: PatchApplicationDto,
  ): Promise<PatchApplicationDto> {
    Logger.log({
      message: "Début de la modification de l'application",
      applicationToUpdate: applicationToUpdate,
      action: 'patch',
    });
    return this.applicationService.update({
      where: { id: id },
      data: applicationToUpdate,
    });
  }
}
