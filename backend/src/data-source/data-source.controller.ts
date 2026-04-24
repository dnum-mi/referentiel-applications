import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { Permission, Prisma } from "@prisma/client";
import { RequiredPermissions } from "src/common/decorators/required-permissions.decorator";
import { PermissionGuard } from "src/common/guards/permission.guard";
import { UserId } from "../common/decorators/user-id.decorator";
import { DataSourceService } from "./data-source.service";
import { CreateDataSourceDto } from "./dto/create-data-source.dto";
import {
  DataSourceDto,
  DataSourceFiltersDto,
  UpdateDataSourceDto,
} from "./dto/data-source.dto";
import { PaginatedResponseDto } from "src/common/dto/paginated-response.dto";

@ApiTags("Data Sources")
@UseGuards(PermissionGuard)
@Controller("applications/:applicationId/data-source")
export class DataSourceController {
  constructor(private readonly service: DataSourceService) {}

  @Post()
  @RequiredPermissions([Permission.AppWrite])
  @ApiBody({ type: CreateDataSourceDto })
  @ApiOperation({
    summary: "Créer une nouvelle source de donnée",
    description: `
**Ce endpoint permet de créer une source de donnée complète liée à une application.**

Informations traitées :
- **Nom** : Nom d'usage.
- **Description** : Description détaillée.
- **IsReference** : Indicateur "Source Maître". S'il est à true, cette application est la source officielle, unique et faisant foi pour cette donnée au sein du ministère.
- **Exemple** : Échantillon de données.
- **Conservation** : Durée d'Utilité Administrative (DUA).

- **DatabaseName** : Nom de l'instance de la base de données hôte.
- **DatabaseTableName** : Nom technique de l'entité contenant les données.
- **FieldCount** : Nombre total de colonnes ou de champs que contient la source de donnée.
- **Fields** : Liste textuelle des champs/colonnes.
- **Volumetry** : Représente le nombre actuel d'enregistrements présents dans la source.
- **MonthlyVolumetry** : Estimation du nombre de nouveaux enregistrements ajoutés chaque mois.

- **TypeId** : Lien vers la nature technique du support.
- **SensibilityId** : Lien vers le niveau de protection et de criticité.
- **FamilyId** : Lien vers la classification thématique.
- **UpdateFrequencyId** : Lien vers le rythme de rafraîchissement des données.
    `,
  })
  @ApiCreatedResponse({
    type: DataSourceDto,
    description: "Source de donnée créée avec succès.",
  })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @UserId() userId: string,
    @Body() createDataSourceDto: CreateDataSourceDto,
    @Param("applicationId") applicationId: string,
  ): Promise<DataSourceDto> {
    const {
      typeId,
      sensibilityId,
      familyId,
      updateFrequencyId,
      ...scalarFields
    } = createDataSourceDto;

    return this.service.create(
      {
        ...scalarFields,
        application: { connect: { id: applicationId } },
        ...(typeId && {
          type: { connect: { id: typeId } },
        }),
        ...(sensibilityId && {
          sensibility: { connect: { id: sensibilityId } },
        }),
        ...(familyId && {
          family: { connect: { id: familyId } },
        }),
        ...(updateFrequencyId && {
          updateFrequency: { connect: { id: updateFrequencyId } },
        }),
      },
      {
        applicationId,
        metadata: {
          userId,
          gender: "de la source de donnée",
          getColumn: (entity) => entity.name,
          entity: "dataSourceId",
        },
      },
    );
  }

  @Get()
  @RequiredPermissions([Permission.AppRead])
  @ApiOperation({
    summary: "Récupérer les sources de donnée par ID d'application",
    description: `
Ce endpoint permet de récupérer la liste de tous les sources de donnée d'une application en fonction de son identifiant unique.

Le paramètre **applicationId** doit être fourni dans l'URL.
    `,
  })
  @ApiOkResponse({
    description: "Liste des sources de donnée",
    type: PaginatedResponseDto.of(DataSourceDto),
  })
  async findAll(
    @Param("applicationId") applicationId: string,
    @Query() filters: DataSourceFiltersDto,
  ) {
    return this.service.find({ ...filters, applicationId });
  }

  @Patch(":id")
  @RequiredPermissions([Permission.AppWrite])
  @ApiOperation({
    summary: "Mettre à jour une source de donnée existante",
  })
  @ApiParam({ name: "applicationId", description: "ID de l'application" })
  @ApiParam({ name: "id", description: "ID de la source de donnée" })
  @ApiBody({ type: UpdateDataSourceDto })
  @ApiOkResponse({
    description: "Source de donnée mise à jour",
    type: DataSourceDto,
  })
  update(
    @UserId() userId: string,
    @Param("applicationId") applicationId: string,
    @Param("id") id: string,
    @Body() updateDataSourceDto: UpdateDataSourceDto,
  ) {
    const {
      typeId,
      sensibilityId,
      familyId,
      updateFrequencyId,
      ...scalarFields
    } = updateDataSourceDto;

    const handleRelation = (relationId?: string | null) => {
      if (relationId) return { connect: { id: relationId } };
      if (relationId === null) return { disconnect: true };
      return undefined;
    };

    const updateData: Prisma.DataSourceUpdateInput = {
      ...scalarFields,
      type: handleRelation(typeId),
      sensibility: handleRelation(sensibilityId),
      family: handleRelation(familyId),
      updateFrequency: handleRelation(updateFrequencyId),
    };

    return this.service.update(id, updateData, {
      applicationId,
      include: {
        type: true,
        sensibility: true,
        family: true,
        updateFrequency: true,
      },
      metadata: {
        userId,
        entity: "dataSourceId",
        gender: "de la source de donnée",
        getColumn: (entity) => entity.name,
        fields: {
          name: "nom",
          isReference: "source maître",
          example: "exemple",
          databaseName: "base de donnée",
          databaseTableName: "table",
          fieldCount: "nombre de colonnes/champs",
          fields: "liste des colonnes/champs",
          volumetry: "nombre d'enregistrements",
          monthlyVolumetry: "nouveaux enregistrements par mois",
          "type.label": "type",
          "sensibility.label": "sensibilité",
          "family.label": "famille",
          "updateFrequency.label": "fréquence",
        },
      },
    });
  }

  @Delete(":id")
  @RequiredPermissions([Permission.AppWrite])
  @ApiOperation({
    summary: "Supprimer une source de donnée",
    description: ` Ce endpoint permet de supprimer une source de donnée existante. 
    Vous devez fournir l'identifiant de la source de donnée dans l'URL.
    `,
  })
  @ApiNoContentResponse({
    description: "Source de donnée supprimée avec succès",
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @UserId() userId: string,
    @Param("applicationId") applicationId: string,
    @Param("id") id: string,
  ) {
    await this.service.delete(id, {
      applicationId,
      metadata: {
        userId,
        gender: "de la source de donnée",
        getColumn: (entity) => entity.name,
        entity: "dataSourceId",
      },
    });
  }
}
