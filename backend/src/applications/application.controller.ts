import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiAcceptedResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { Response } from "express";

import { Permission } from "@prisma/client";
import { RequiredPermissions } from "src/common/decorators/required-permissions.decorator";
import { User } from "src/common/decorators/user.decorator";
import { PermissionGuard } from "src/common/guards/permission.guard";
import { APP_PERMISSIONS, AppPermissionsValues } from "src/common/utils/types";
import { MetadatasService } from "src/metadatas/metadatas.service";
import { Requestor } from "src/user/entities/user.entity";
import { UserId } from "../common/decorators/user-id.decorator";
import { ApplicationService } from "./application.service";
import {
  CreateApplicationDto,
  PatchApplicationDto,
} from "./dto/create-application.dto";
import {
  ApplicationDto,
  ApplicationSearchResultDto,
  CountByIqDto,
  CountByMonthDto,
} from "./dto/get-application.dto";
import { ApplicationSearchDto } from "./dto/search-application.dto";
import { ApplicationExportService } from "./export.service";
import { ExportApplicationsUseCase } from "./usecases/application-export.usecase";

@ApiTags("applications")
@Controller("applications")
export class ApplicationController {
  constructor(
    private readonly applicationService: ApplicationService,
    private readonly exportApplicationsUseCase: ExportApplicationsUseCase,
    private readonly applicationExportService: ApplicationExportService,
    private readonly metadataService: MetadatasService,
  ) {}

  @Post()
  @ApiBody({ type: CreateApplicationDto })
  @ApiOperation({
    summary: "Créer une nouvelle application",
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
  - **source**: La source du libelé.
  - **value**: Le libellé alternatif.
- **compliances**: La liste des conformités associées avec :
  - Champs spécifiques selon le type de conformité (DIMA, PDMA, HOMOLOGATION, RGAA, DSFR, RGPD).
    `,
  })
  @ApiCreatedResponse({
    description: "Application créée avec succès.",
    type: ApplicationDto,
  })
  @UseGuards(PermissionGuard)
  @RequiredPermissions([Permission.CreateApplication])
  public async create(
    @Body() createApplicationDto: CreateApplicationDto,
    @UserId() requestorId: string,
  ) {
    const newApplication = await this.applicationService.createApplication(
      requestorId,
      createApplicationDto,
    );
    return newApplication;
  }

  @Get("count-by-month")
  @ApiOperation({
    summary: "Liste le nombre d'applications sur les 6 derniers mois",
  })
  @ApiOkResponse({
    description: "Nombre d'applications par mois",
    type: CountByMonthDto,
    isArray: true,
  })
  async countByMonth(): Promise<CountByMonthDto[]> {
    return this.applicationService.getApplicationsCountByMonth();
  }

  @Get("count-by-iq")
  @ApiOperation({
    summary:
      "Liste le nombre d'applications par indice de qualité (de 0% à 100%)",
  })
  @ApiOkResponse({
    description: "Nombre d'applications par indice de qualité",
    type: CountByIqDto,
    isArray: true,
  })
  async countByIq(): Promise<CountByIqDto[]> {
    return this.applicationService.getApplicationsCountByIq();
  }

  @Get()
  @ApiOperation({
    summary: "Rechercher et filtrer les applications",
    description: `Endpoint unifié pour rechercher, filtrer et paginer les applications.
      Supporte tous les types de filtres : label, shortName, tags, priorityRestart, hostingSearch, etc.
      Inclut la pagination et le tri.`,
  })
  @ApiOkResponse({
    description:
      "Liste des applications correspondant aux critères de recherche avec pagination.",
    type: ApplicationSearchResultDto,
  })
  async search(
    @Query() searchParams: ApplicationSearchDto,
    @User() requestor: Requestor,
  ): Promise<ApplicationSearchResultDto> {
    return this.applicationService.search(searchParams, requestor);
  }

  @Get(":applicationId/my-perms")
  @UseGuards(PermissionGuard)
  @RequiredPermissions([Permission.readBase])
  @ApiOperation({
    summary: "Lister les droits de l'utilisateur sur l'application",
  })
  @ApiOkResponse({
    description: "Droits de l'utilisateur sur l'application",
    schema: {
      type: "array",
      items: {
        type: "string",
        enum: AppPermissionsValues,
      },
    },
  })
  @ApiParam({
    name: "applicationId",
    required: true,
    type: String,
  })
  getMyPerms(@User() user: Requestor): Promise<APP_PERMISSIONS[]> {
    return this.applicationService.getMyPerms(user);
  }

  @Get("export/excel")
  @UseGuards(PermissionGuard)
  @RequiredPermissions([Permission.manageAdminPanel])
  @ApiOperation({
    summary: "Exporter les applications en Excel",
    description: `Permet d'exporter les applications en un fichier Excel.
      Vous pouvez ajouter des filtres de recherche pour n'exporter que les applications correspondantes.
      Si aucun filtre n'est appliqué, toutes les applications sont exportées.
      Accès limité aux utilisateurs avec privilège admin.`,
  })
  @ApiOkResponse({
    description: "Export Excel des applications",
    content: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
        schema: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: "Accès refusé - Privilège admin requis",
  })
  async exportExcel(
    @Query() searchParams: ApplicationSearchDto,
    @Res() res: Response,
    @UserId() requestorId: string,
  ) {
    const buffer =
      Object.keys(searchParams).length > 0
        ? await this.applicationExportService.exportSearchResultsToExcel(
            searchParams,
          )
        : await this.exportApplicationsUseCase.execute();

    await this.metadataService.createMetadata({
      createdById: requestorId,
      title: "des données",
      type: "export",
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=applications_export.xlsx",
    );
    res.send(buffer);
  }

  @Get(":applicationId")
  @UseGuards(PermissionGuard)
  @RequiredPermissions([Permission.readBase])
  @ApiOperation({
    summary: "Récupérer une application spécifique par ID",
    description: `
Ce endpoint permet de récupérer les détails complets d'une application en fonction de son identifiant unique.

Le paramètre **id** doit être fourni dans l'URL.
    `,
  })
  @ApiOkResponse({
    description: "Application trouvée avec succès",
    type: ApplicationDto,
  })
  async findOne(
    @Param("applicationId") id: string,
    @User() user: Requestor,
  ): Promise<ApplicationDto> {
    return this.applicationService.getApplicationById(id, user);
  }

  @Get("data-quality/update")
  @UseGuards(PermissionGuard)
  @RequiredPermissions([Permission.manageAdminPanel])
  @ApiOperation({
    summary: "Mettre à jour l'indice de qualité de toutes les applications",
    description: ` Ce endpoint permet de mettre à jour l'indice de qualité des applications existantes.
    Seulement accessible par les administrateurs.
    `,
  })
  @ApiAcceptedResponse({
    description: "Mise à jour des indices de qualité en cours...",
    type: String,
  })
  @ApiForbiddenResponse({
    description: "Accès refusé - Privilège admin requis",
  })
  @HttpCode(HttpStatus.ACCEPTED)
  async updateAllApplicationsQuality() {
    this.applicationService.updateAllApplicationsQualityInBackground();
    return {
      message: "Mise à jour des indices de qualité en cours...",
    };
  }

  @Patch(":applicationId")
  @UseGuards(PermissionGuard)
  @RequiredPermissions([Permission.writeBase, Permission.writePriorityRestart])
  @ApiOperation({
    summary: "Mettre à jour une application",
    description: ` Ce endpoint permet de mettre à jour une application existante. 
    Vous devez fournir l'identifiant de l'application dans l'URL et les nouvelles données dans le corps de la requête. Les données de mise à jour doivent correspondre aux champs.
    `,
  })
  @ApiOkResponse({
    description: "Application mise à jour avec succès",
    type: ApplicationDto,
  })
  async update(
    @User() requestor: Requestor,
    @Param("applicationId") id: string,
    @Body() applicationToUpdate: PatchApplicationDto,
  ): Promise<ApplicationDto> {
    Logger.log({
      message: "Début de la modification de l'application",
      applicationToUpdate,
      action: "patch",
    });
    return this.applicationService.update({
      where: { id },
      data: applicationToUpdate,
      requestor,
    });
  }

  @Delete(":applicationId")
  @UseGuards(PermissionGuard)
  @RequiredPermissions([Permission.manageAdminPanel])
  @ApiOperation({
    summary: "Supprimer une application",
    description: "Supprime une application par son ID.",
  })
  @ApiNoContentResponse({
    description: "Application supprimée avec succès.",
  })
  @ApiNotFoundResponse({ description: "Application non trouvée." })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("applicationId") id: string) {
    await this.applicationService.deleteApplication(id);
    return { message: "Application supprimée avec succès." };
  }
}
