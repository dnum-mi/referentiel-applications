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
} from '@nestjs/common';
import { ApplicationService } from './application.service';

import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ApplicationExportService } from './export.service';
import {
  CreateApplicationDto,
  PatchApplicationDto,
} from './application/dto/create-application.dto';
import { SearchApplicationDto } from './application/dto/search-application.dto';
import { GetApplicationDto } from './application/dto/get-application.dto';
import { ComplianceStatus, ComplianceType } from 'src/enum';
import { Response } from 'express';
import { UserId } from '../common/decorators/user-id.decorator';

@ApiTags('applications')
@Controller('applications')
export class ApplicationController {
  applicationsService: ApplicationService;
  ExportApplicationsUseCase: any;

  constructor(
    private readonly applicationService: ApplicationService,
    private readonly exportApplicationsUseCase: ExportApplicationsUseCase,
    private readonly applicationExportService: ApplicationExportService,
  ) { }

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
  - **source**: La source de l'application.
  - **value**: Le libellé de l'application.
  - **shortname**: Le nom court de l'application.
- **compliances**: La liste des conformités associées avec :
  - **type**: Le type de conformité (Enum: ${Object.values(ComplianceType).join(', ')}).
  - **name**: Le nom de la conformité.
  - **status**: Le statut (Enum: ${Object.values(ComplianceStatus).join(', ')}).
  - **validityStart**: Date de début de validité.
  - **validityEnd**: Date de fin de validité.
  - **scoreValue**: Valeur du score.
  - **scoreUnit**: Unité du score.
  - **notes**: Notes complémentaires.
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

  @Get('search')
  @ApiOperation({ summary: 'Rechercher des applications' })
  @ApiResponse({
    status: 200,
    description:
      'Liste des applications correspondant aux critères de recherche.',
  })
  async searchApplications(@Query() searchParams: SearchApplicationDto) {
    return this.applicationService.searchApplications(searchParams);
  }

  @Get(':id/metadatas/first')
  @ApiOperation({
    summary: 'Récupérer la dernière metadata par ID',
    description: `
Ce endpoint permet de récupérer les détails complets de la metadata de création d'une application en fonction de son identifiant unique.

Le paramètre **id** doit être fourni dans l'URL.
    `,
  })
  getFirstMetadata(@Param('id') id: string) {
    return this.applicationService.getFirstMetadata(id);
  }

  @Get(':id/metadatas/latest')
  @ApiOperation({
    summary: 'Récupérer la dernière metadata par ID',
    description: `
Ce endpoint permet de récupérer les détails complets de la metadata la plus récente d'une application en fonction de son identifiant unique.

Le paramètre **id** doit être fourni dans l'URL.
    `,
  })
  getLatestMetadata(@Param('id') id: string) {
    return this.applicationService.getLatestMetadata(id);
  }

  @Get('export/excel')
  @ApiOperation({
    summary: 'Exporter les applications en Excel',
    description: `Permet d'exporter les applications en un fichier Excel.
      Vous pouvez ajouter des filtres de recherche pour n'exporter que les applications correspondantes.
      Si aucun filtre n'est appliqué, toutes les applications sont exportées.`,
  })
  @ApiResponse({
    status: 200,
    description: 'Export Excel des applications',
  })
  async exportExcel(
    @Query() searchParams: SearchApplicationDto,
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
  @ApiOperation({
    summary: 'Exporter les applications en CSV',
    description: `Permet d'exporter les applications en un fichier CSV.
      Vous pouvez ajouter des filtres de recherche pour n'exporter que les applications correspondantes.
      Si aucun filtre n'est appliqué, toutes les applications sont exportées.`,
  })
  @ApiResponse({
    status: 200,
    description: 'Export CSV des applications',
  })
  async exportCsv(
    @Query() searchParams: SearchApplicationDto,
    @Res() res: Response,
  ) {
    // Default columns to export if none specified
    const columns = searchParams.columns || [
      'id',
      'label',
      'shortName',
      'description',
      'tags',
      'purposes',
      'priorityRestart',
    ];

    // Generate the CSV
    const result = await this.applicationExportService.exportApplications(
      columns,
      searchParams,
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${result.fileName}`,
    );
    res.send(result.csv);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Récupérer une application spécifique par ID',
    description: `
Ce endpoint permet de récupérer les détails complets d'une application en fonction de son identifiant unique.

Le paramètre **id** doit être fourni dans l'URL.
    `,
  })
  async findOne(@Param('id') id: string): Promise<GetApplicationDto> {
    return await this.applicationService.getApplicationById(id);
  }

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

  @Patch(':id')
  @ApiOperation({
    summary: 'Mettre à jour une application',
    description: ` Ce endpoint permet de mettre à jour une application existante. 
    Vous devez fournir l'identifiant de l'application dans l'URL et les nouvelles données dans le corps de la requête. Les données de mise à jour doivent correspondre aux champs.
    `,
  })
  async update(
    @UserId() userId: string,
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
      ownerId: userId,
    });
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Supprimer une application',
    description: 'Supprime une application par son ID.',
  })
  @ApiResponse({
    status: 200,
    description: 'Application supprimée avec succès.',
  })
  @ApiResponse({ status: 404, description: 'Application non trouvée.' })
  async remove(@Param('id') id: string) {
    await this.applicationService.deleteApplication(id);
    return { message: 'Application supprimée avec succès.' };
  }
}
