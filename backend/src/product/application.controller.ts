import { ExportApplicationsUseCase } from './application/usecases/application-export.usecase';
import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  Get,
  Query,
  Logger,
  Delete,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApplicationService } from './application.service';

import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ApplicationExportService } from './export.service';
import {
  CreateApplicationDto,
  PatchApplicationDto,
} from './application/dto/create-application.dto';
import { ApplicationSearchDto } from './application/dto/search-application.dto';
import { GetApplicationDto } from './application/dto/get-application.dto';
import { Response } from 'express';
import { UserId } from '../common/decorators/user-id.decorator';
import { RequiredAdminLevel } from '../common/decorators/admin.decorator';
import { ApplicationGuard } from 'src/common/guards/application.guard';
import { AppAction } from 'src/common/decorators/application.decorator';
import { ApplicationRights } from './application/dto/application-rights.dto';
import { User } from 'src/common/decorators/user.decorator';
import { AdminLevel, UserEntity } from 'src/user/entities/user.entity';
import { AdminGuard } from 'src/common/guards/admin.guard';

@ApiTags('applications')
@Controller('applications')
export class ApplicationController {
  constructor(
    private readonly applicationService: ApplicationService,
    private readonly exportApplicationsUseCase: ExportApplicationsUseCase,
    private readonly applicationExportService: ApplicationExportService,
  ) {}

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
  - **firstProductionDate**: Date de première mise en production.
  - **plannedDecommissioningDate**: Date prévue de déclassement.
- **labels**: Les différents libellés alternatifs de l'application.
  - **source**: La source du libelé.
  - **value**: Le libellé alternatif.
- **compliances**: La liste des conformités associées avec :
  - Champs spécifiques selon le type de conformité (DIMA, PDMA, HOMOLOGATION, RGAA, DSFR, RGPD).
    `,
  })
  @ApiResponse({ status: 201, description: 'Application créée avec succès.' })
  @ApiResponse({ status: 404, description: 'Metadata ou parent non trouvé.' })
  public async create(
    @Body() createApplicationDto: CreateApplicationDto,
    @UserId() userId: string,
  ) {
    Logger.log({
      message: "Début de la création de l'application",
      userId: userId,
      action: 'create',
    });
    const newApplication = await this.applicationService.createApplication(
      userId,
      createApplicationDto,
    );
    return newApplication;
  }

  @Get('count-by-status')
  @ApiOperation({
    summary: "Compte le nombre d'applications hors statut supprimé",
  })
  async count() {
    return this.applicationService.countActiveApplications();
  }

  @Get('count-by-month')
  @ApiOperation({
    summary: "Liste le nombre d'applications sur les 6 derniers mois",
  })
  async countByMonth() {
    return this.applicationService.getApplicationsCountByMonth();
  }

  @Get('count-by-iq')
  @ApiOperation({
    summary:
      "Liste le nombre d'applications par indice de qualité (de 0% à 100%)",
  })
  async countByIq() {
    return this.applicationService.getApplicationsCountByIq();
  }

  @Get('search')
  @ApiOperation({
    summary: 'Rechercher et filtrer les applications',
    description: `Endpoint unifié pour rechercher, filtrer et paginer les applications.
      Supporte tous les types de filtres : label, shortName, tags, priorityRestart, hostingSearch, etc.
      Inclut la pagination et le tri.`,
  })
  @ApiResponse({
    status: 200,
    description:
      'Liste des applications correspondant aux critères de recherche avec pagination.',
  })
  async search(
    @Query() searchParams: ApplicationSearchDto,
    @User() user: UserEntity,
  ) {
    return this.applicationService.search(searchParams, user);
  }

  @Get(':applicationId/metadatas')
  @UseGuards(ApplicationGuard)
  @AppAction('readMetadata')
  @ApiOperation({
    summary: 'Lister les metadatas d’une application avec pagination et tri',
  })
  getMetadatas(
    @Param('applicationId') id: string,
    @Query('offset') offset = 0,
    @Query('limit') limit = 1,
    @Query('order') order: 'asc' | 'desc' = 'asc',
  ) {
    return this.applicationService.getSortedMetadatas(
      id,
      Number(offset),
      Number(limit),
      order,
    );
  }

  @Get(':applicationId/my-perms')
  @UseGuards(ApplicationGuard)
  @AppAction('readBase')
  @ApiOperation({
    summary: "Lister les droits de l'utilisateur sur l'application",
  })
  getMyPerms(
    @Param('applicationId') id: string,
    @User() user: UserEntity,
  ): Promise<ApplicationRights> {
    return this.applicationService.getMyPerms(id, user.email);
  }

  @Get('export/excel')
  @UseGuards(AdminGuard)
  @RequiredAdminLevel(AdminLevel.ADMIN)
  @ApiOperation({
    summary: 'Exporter les applications en Excel',
    description: `Permet d'exporter les applications en un fichier Excel.
      Vous pouvez ajouter des filtres de recherche pour n'exporter que les applications correspondantes.
      Si aucun filtre n'est appliqué, toutes les applications sont exportées.
      Accès limité aux utilisateurs avec privilège admin.`,
  })
  @ApiResponse({
    status: 200,
    description: 'Export Excel des applications',
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé - Privilège admin requis',
  })
  async exportExcel(
    @Query() searchParams: ApplicationSearchDto,
    @Res() res: Response,
  ) {
    const buffer =
      Object.keys(searchParams).length > 0
        ? await this.applicationExportService.exportSearchResultsToExcel(
            searchParams,
          )
        : await this.exportApplicationsUseCase.execute();

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=applications_export.xlsx',
    );
    res.send(buffer);
  }

  @Get('export')
  @UseGuards(AdminGuard)
  @RequiredAdminLevel(AdminLevel.ADMIN)
  @ApiOperation({
    summary: 'Exporter les applications en CSV',
    description: `Permet d'exporter les applications en un fichier CSV.
      Vous pouvez ajouter des filtres de recherche pour n'exporter que les applications correspondantes.
      Si aucun filtre n'est appliqué, toutes les applications sont exportées.
      Cette nouvelle version utilise une vue optimisée qui inclut tous les acteurs, conformités et hébergements.
      Accès limité aux utilisateurs avec privilège admin.`,
  })
  @ApiResponse({
    status: 200,
    description: 'Export CSV détaillé des applications',
  })
  async exportCsv(
    @Query() searchParams: ApplicationSearchDto,
    @Res() res: Response,
  ) {
    const result =
      await this.applicationExportService.exportApplications(searchParams);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${result.fileName}`,
    );
    res.send(result.csv);
  }

  @Get(':applicationId')
  @UseGuards(ApplicationGuard)
  @AppAction('readBase')
  @ApiOperation({
    summary: 'Récupérer une application spécifique par ID',
    description: `
Ce endpoint permet de récupérer les détails complets d'une application en fonction de son identifiant unique.

Le paramètre **id** doit être fourni dans l'URL.
    `,
  })
  async findOne(
    @Param('applicationId') id: string,
  ): Promise<GetApplicationDto> {
    return await this.applicationService.getApplicationById(id);
  }

  @Get()
  // TODO réserver pour les administrateurs
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

  @Patch('data-quality')
  @UseGuards(AdminGuard)
  @RequiredAdminLevel(AdminLevel.ADMIN)
  @ApiOperation({
    summary: "Mettre à jour l'indice de qualité de toutes les applications",
    description: ` Ce endpoint permet de mettre à jour l'indice de qualité des applications existantes.
    Seulement accessible par les administrateurs.
    `,
  })
  async updateAllApplicationsQuality() {
    Logger.log({
      message: 'Début de la modification des indices de qualités',
      action: 'patch',
    });

    this.applicationService.updateAllApplicationsQualityInBackground();
    return {
      statusCode: 202,
      message: 'Mise à jour des indices de qualité en cours...',
    };
  }

  @Patch(':applicationId')
  @UseGuards(ApplicationGuard)
  @AppAction('writeBase')
  @ApiOperation({
    summary: 'Mettre à jour une application',
    description: ` Ce endpoint permet de mettre à jour une application existante. 
    Vous devez fournir l'identifiant de l'application dans l'URL et les nouvelles données dans le corps de la requête. Les données de mise à jour doivent correspondre aux champs.
    `,
  })
  async update(
    @UserId() userId: string,
    @Param('applicationId') id: string,
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
      ownerId: userId,
    });
  }

  @Delete(':applicationId')
  // TODO réserver pour les administrateurs
  @UseGuards(AdminGuard)
  @RequiredAdminLevel(AdminLevel.ADMIN)
  @ApiOperation({
    summary: 'Supprimer une application',
    description: 'Supprime une application par son ID.',
  })
  @ApiResponse({
    status: 200,
    description: 'Application supprimée avec succès.',
  })
  @ApiResponse({ status: 404, description: 'Application non trouvée.' })
  async remove(@Param('applicationId') id: string) {
    await this.applicationService.deleteApplication(id);
    return { message: 'Application supprimée avec succès.' };
  }
}
