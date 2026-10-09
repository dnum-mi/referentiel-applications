import { Controller, Get, Logger, Post, UseGuards } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Permission } from "@prisma/client";
import { RequiredPermissions } from "src/common/decorators/required-permissions.decorator";
import { User } from "src/common/decorators/user.decorator";
import { PermissionGuard } from "src/common/guards/permission.guard";
import { Requestor } from "src/user/entities/user.entity";
import { GristRecordDto } from "./dto/grist-record.dto";
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
    summary: "Synchroniser les applications avec Grist",
    description: `Écrit toutes les applications dans la table RefApp du document Grist configuré.
La table est créée au premier appel. Chaque application est retrouvée par son identifiant (refapp_id) :
les colonnes nom et statut sont mises à jour, les colonnes metadata_1 à metadata_3 saisies dans Grist
sont conservées. Les Access Rules rendent refapp_id, nom et statut non modifiables et interdisent
l'ajout et la suppression de lignes pour les non-propriétaires du document.`,
  })
  @ApiOkResponse({ type: GristSyncReportDto })
  async setup(@User() requestor: Requestor): Promise<GristSyncReportDto> {
    const report = await this.gristService.setup();
    Logger.log({
      message: "Synchronisation Grist terminée",
      userId: requestor.id,
      action: "grist-sync",
      ...report,
    });
    return report;
  }

  @Get("records")
  @RequiredPermissions([Permission.GristSync])
  @ApiOperation({
    summary: "Lire la table RefApp de Grist",
    description:
      "Retourne les lignes de la table RefApp, métadonnées saisies dans Grist comprises.",
  })
  @ApiOkResponse({ type: GristRecordDto, isArray: true })
  records(): Promise<GristRecordDto[]> {
    return this.gristService.records();
  }
}
