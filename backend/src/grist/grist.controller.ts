import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { Permission } from "@prisma/client";
import { ApplicationSearchDto } from "src/applications/dto/search-application.dto";
import { RequiredPermissions } from "src/common/decorators/required-permissions.decorator";
import { User } from "src/common/decorators/user.decorator";
import { PermissionGuard } from "src/common/guards/permission.guard";
import { Requestor } from "src/user/entities/user.entity";
import { GristRecordDto } from "./dto/grist-record.dto";
import { GristDocumentTablesDto, GristSyncDto } from "./dto/grist-sync.dto";
import { GristSyncReportDto } from "./dto/grist-sync-report.dto";
import { GristService } from "./grist.service";

@ApiTags("Grist")
@UseGuards(PermissionGuard)
@Controller("grist")
export class GristController {
  constructor(private readonly gristService: GristService) {}

  @Post("setup")
  @RequiredPermissions([Permission.GristSync])
  @ApiOperation({
    summary:
      "Synchroniser avec Grist les applications correspondant aux filtres",
    description: [
      "Écrit dans les documents Grist du profil de l'utilisateur (gristDocIds) ce que la page de recherche affiche : les applications correspondant aux filtres (même périmètre que la recherche ; `page` et `pageSize` sont ignorés), avec les colonnes visibles (`columns`) et les mêmes valeurs. Une colonne réservée (ColumnRead) n'est jamais écrite pour un utilisateur qui ne peut pas la voir. Sans document dans le profil, l'appel répond 400 ; une cible hors profil répond 403.",
      "Le corps `targets` choisit, par document, une table existante (`tableId`, voir GET /grist/tables) ou une nouvelle table (`newTable`, premier nom libre parmi RefApp, RefApp2, RefApp3…). Sans `targets`, chaque document du profil est synchronisé dans sa première table RefApp, créée au premier appel. Une table RefApp sans colonne refapp_id n'a pas été créée par RefApp et n'est jamais modifiée.",
      "Chaque application est retrouvée par son identifiant (refapp_id) : les colonnes RefApp sont mises à jour, les colonnes ajoutées dans Grist (métadonnées) sont conservées. Les colonnes RefApp de la table suivent les colonnes visibles : celles qui manquent sont ajoutées avant les métadonnées, celles qui ne sont plus affichées sont supprimées (ainsi que dans_selection et motif_sortie des versions précédentes). Chaque table garde sa propre sélection : seule la table visée est modifiée.",
      "Les lignes dont l'application n'est plus dans la sélection sont conservées telles quelles si une colonne de données ajoutée dans Grist y a une valeur, supprimées sinon. Une application qui revient dans la sélection retrouve sa ligne.",
      "Les Access Rules rendent les colonnes écrites par RefApp non modifiables et interdisent l'ajout et la suppression de lignes pour tous, propriétaires du document compris. La synchronisation retire ces règles le temps d'écrire, puis les remet, même en cas d'échec ; les autres règles de la table sont supprimées.",
      "Les cibles sont traitées indépendamment : une cible en échec (droits, document ou table introuvable…) n'empêche pas les suivantes, et le compte rendu donne le résultat de chacune.",
    ].join("\n\n"),
  })
  @ApiOkResponse({ type: GristSyncReportDto })
  async setup(
    @Query() searchParams: ApplicationSearchDto,
    @Body() { targets, columns }: GristSyncDto,
    @User() requestor: Requestor,
  ): Promise<GristSyncReportDto> {
    const report = await this.gristService.setup(
      searchParams,
      requestor,
      targets,
      columns,
    );
    for (const document of report.documents) {
      Logger.log({
        message: "Synchronisation Grist terminée",
        userId: requestor.id,
        action: "grist-sync",
        ...document,
      });
    }
    return report;
  }

  @Get("tables")
  @RequiredPermissions([Permission.GristSync])
  @ApiOperation({
    summary: "Lister les tables RefApp des documents Grist du profil",
    description:
      "Pour chaque document du profil, les tables écrites par RefApp (RefApp, RefApp2…), pour choisir où synchroniser. Un document illisible est renvoyé avec son erreur, sans bloquer les autres.",
  })
  @ApiOkResponse({ type: GristDocumentTablesDto, isArray: true })
  tables(@User() requestor: Requestor): Promise<GristDocumentTablesDto[]> {
    return this.gristService.tables(requestor);
  }

  @Get("records")
  @RequiredPermissions([Permission.GristSync])
  @ApiOperation({
    summary: "Lire la table RefApp d'un document Grist",
    description:
      "Retourne les lignes d'une table RefApp du document (par défaut la première), avec dans `values` les colonnes écrites par RefApp et dans `metadata` les colonnes de données ajoutées dans Grist. Le document doit figurer dans le profil de l'utilisateur (403 sinon) ; sans table RefApp, la liste est vide.",
  })
  @ApiQuery({ name: "docId", description: "Identifiant du document Grist" })
  @ApiQuery({
    name: "tableId",
    required: false,
    description: "Table RefApp à lire (RefApp, RefApp2…)",
  })
  @ApiOkResponse({ type: GristRecordDto, isArray: true })
  records(
    @Query("docId") docId: string,
    @User() requestor: Requestor,
    @Query("tableId") tableId?: string,
  ): Promise<GristRecordDto[]> {
    return this.gristService.records(docId, requestor, tableId);
  }
}
