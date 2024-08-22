import {
  Body,
  Controller,
  Get,
  NotAcceptableException,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { UUIDParam } from '../global-dto/uuid-param.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FilterApplicationsDto } from './dto/filter-applications.dto';
import { PrismaService } from '../prisma/prisma.service';

import { ConfigService } from '@nestjs/config';

import { CurrentUser } from '../current-user/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Application } from './entities/application.entity';
import { Resource } from '../auth/policies-guard.guard';

//TODO: Refactor clean the code!
@Resource('Application')
@ApiTags('Applications')
@Controller('applications')
export class ApplicationsController {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly applicationsService: ApplicationsService,
  ) {}

  @Get('/status')
  @ApiOperation({
    summary: 'Obtenir tous les statuts',
    description:
      "Récupère une liste de tous les statuts disponibles dans l'application.",
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des statuts récupérée avec succès.',
  })
  @ApiResponse({ status: 500, description: 'Erreur interne du serveur.' })
  async getStatuses() {
    return this.prisma.appStatus.findMany();
  }

  @Get('/sensibilites')
  @ApiOperation({
    summary: 'Obtenir toutes les sensibilités',
    description:
      "Récupère une liste de toutes les sensibilités disponibles dans l'application.",
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des sensibilités récupérée avec succès.',
  })
  @ApiResponse({ status: 500, description: 'Erreur interne du serveur.' })
  async getSensibilites() {
    return this.prisma.refSensitivity.findMany();
  }

  @Get('/app-types')
  @ApiOperation({
    summary: "Obtenir tous les types d'application",
    description:
      "Récupère une liste de tous les types d'application disponibles.",
  })
  @ApiResponse({
    status: 200,
    description: "Liste des types d'application récupérée avec succès.",
  })
  @ApiResponse({ status: 500, description: 'Erreur interne du serveur.' })
  async getAppTypes() {
    return this.prisma.appType.findMany();
  }

  private async updateOrCreate(
    user: User,
    inputData: CreateApplicationDto | UpdateApplicationDto,
    isCreating: boolean,
    applicationId?: string,
  ) {
    const application: Application | null =
      await this.applicationsService.getOneByNameAndOrgnisation(
        inputData.longname!,
        inputData.organisation,
        inputData.organisationid,
      );

    if (application && application.applicationid !== applicationId) {
      throw new NotAcceptableException(
        `Le nom et l'organisation de l'application doivent être uniques!`,
      );
    }

    // if (!isCreating && applicationId) {
    //   // updating
    //   application = await this.applicationsService.getOneById(applicationId);

    // if (!application) {
    //   throw new NotFoundException(`Application ${applicationId} doesn't exist`);
    // }
    //}

    const result = await this.applicationsService.updateOrCreate(
      user.username,
      inputData,
      isCreating,
      application ?? applicationId,
    );

    if (typeof result === 'string') {
      throw new NotFoundException(result);
    }

    return result;
  }

  @Post()
  @ApiOperation({
    summary: 'Créer une nouvelle application',
    description:
      'Crée une nouvelle application avec les informations fournies.',
  })
  @ApiResponse({
    status: 201,
    description: 'Application créée avec succès.',
    type: Application,
  })
  @ApiResponse({ status: 400, description: 'Requête invalide.' })
  @ApiResponse({ status: 500, description: 'Erreur interne du serveur.' })
  async create(
    @CurrentUser() user: User,
    @Body()
    createApplicationDto: CreateApplicationDto,
  ) {
    return this.updateOrCreate(user, createApplicationDto, true);
  }

  @Get()
  @ApiOperation({
    summary: 'Obtenir toutes les applications',
    description:
      'Récupère une liste de toutes les applications en fonction des filtres fournis.',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des applications récupérée avec succès.',
    type: [Application],
  })
  @ApiResponse({ status: 400, description: 'Requête invalide.' })
  @ApiResponse({ status: 500, description: 'Erreur interne du serveur.' })
  async getAll(
    @CurrentUser() user: User,
    @Query() filters: FilterApplicationsDto,
  ) {
    const orderBy = {} as any;
    for (const sort of filters.sort ?? []) {
      orderBy[sort.key] = sort.order;
      // switch (sort) {
      //   case 'nom': {
      //     orderBy['longname'] = 'asc';
      //     break;
      //   }
      //   case 'statut': {
      //     orderBy['appStatus'] = {
      //       applicationstatuscode: 'asc',
      //     };
      //     break;
      //   }
      //   case 'sensibilite': {
      //     orderBy['refSensitivity'] = {
      //       sensitivitycode: 'asc',
      //     };
      //     break;
      //   }
      // }
    }

    return await this.applicationsService.getAllBy({
      searchQuery: filters.searchQuery,
      currentPage: filters.currentPage,
      maxPerPage: filters.maxPerPage,
      // orderBy,
      nom: filters.nom,
      statut: filters.statut,
      sensibilite: filters.sensibilite,
      parentOnly: filters.parent,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtenir une application par ID',
    description:
      "Récupère les détails d'une application spécifique en utilisant son ID.",
  })
  @ApiResponse({
    status: 200,
    description: 'Application trouvée avec succès.',
    type: Application,
  })
  @ApiResponse({ status: 404, description: 'Application non trouvée.' })
  @ApiResponse({ status: 400, description: 'Requête invalide.' })
  @ApiResponse({ status: 500, description: 'Erreur interne du serveur.' })
  async findOne(@Param() params: UUIDParam) {
    const res = await this.applicationsService.getOneById(params.id);

    if (!res)
      throw new NotFoundException(`Resource with id ${params.id} not found`);

    return res;
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Mettre à jour une application',
    description:
      "Met à jour les détails d'une application existante en utilisant son ID.",
  })
  @ApiResponse({
    status: 200,
    description: 'Application mise à jour avec succès.',
    type: Application,
  })
  @ApiResponse({ status: 404, description: 'Application non trouvée.' })
  @ApiResponse({ status: 400, description: 'Requête invalide.' })
  @ApiResponse({ status: 500, description: 'Erreur interne du serveur.' })
  async update(
    @CurrentUser() user: User,
    @Param() params: UUIDParam,
    @Body() updateApplicationDto: UpdateApplicationDto,
  ) {
    return this.updateOrCreate(user, updateApplicationDto, false, params.id);
  }

  @Get(':id/applications')
  @ApiOperation({
    summary: "Obtenir les sous-applications d'une application",
    description:
      'Récupère une liste de toutes les sous-applications liées à une application spécifique.',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des sous-applications récupérée avec succès.',
    type: [Application],
  })
  @ApiResponse({ status: 404, description: 'Application non trouvée.' })
  @ApiResponse({ status: 400, description: 'Requête invalide.' })
  @ApiResponse({ status: 500, description: 'Erreur interne du serveur.' })
  async getApplicationsByAppId(@Param() params: UUIDParam) {
    return await this.applicationsService.getAllBy({
      parentId: params.id,
    });
  }
}
