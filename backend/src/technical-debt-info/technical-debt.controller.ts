import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Permission } from "@prisma/client";
import { RequiredPermissions } from "src/common/decorators/required-permissions.decorator";
import { User } from "src/common/decorators/user.decorator";
import { PermissionGuard } from "src/common/guards/permission.guard";
import { Requestor } from "src/user/entities/user.entity";
import { ApplicationSearchDto } from "src/applications/dto/search-application.dto";
import { TechnicalDebtPointDto } from "src/applications/dto/technical-debt-point.dto";
import { ApplicationService } from "src/applications/application.service";

// #2502 : ces routes n'avaient ni garde ni permission — MDITList (socle Lecteur, déléguable)
// n'était vérifiée que par le front (TimePage). Alignement sur le contrat affiché.
@ApiTags("technical-debts")
@Controller("technical-debts")
@UseGuards(PermissionGuard)
export class TechnicalDebtController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Get()
  @RequiredPermissions([Permission.MDITList])
  @ApiOperation({
    summary: "Lister les points de dette technique",
    description:
      "Retourne toutes les données de dette technique sans pagination, en appliquant les mêmes filtres que la recherche d'applications.",
  })
  @ApiOkResponse({
    description: "Liste des points de dette technique filtrés",
    type: TechnicalDebtPointDto,
    isArray: true,
  })
  async getTechnicalDebtPoints(
    @Query() searchParams: ApplicationSearchDto,
    @User() requestor: Requestor,
  ): Promise<TechnicalDebtPointDto[]> {
    return this.applicationService.getTechnicalDebtPoints(
      searchParams,
      requestor,
    );
  }

  @Get("millesimes")
  @RequiredPermissions([Permission.MDITList])
  @ApiOperation({
    summary: "Lister les millésimes de campagne dette IT disponibles",
    description:
      "Retourne les millésimes (années) de campagne dette IT enregistrés, " +
      "triés du plus récent au plus ancien.",
  })
  @ApiOkResponse({
    description: "Liste des millésimes disponibles",
    type: Number,
    isArray: true,
  })
  async getMillesimes(): Promise<number[]> {
    return this.applicationService.getTechnicalDebtMillesimes();
  }
}
