import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Permission } from "@prisma/client";
import { RequiredPermissions } from "src/common/decorators/required-permissions.decorator";
import { User } from "src/common/decorators/user.decorator";
import { PaginatedResponseDto } from "src/common/dto";
import { PermissionGuard } from "src/common/guards/permission.guard";
import type { Requestor } from "src/user/entities/user.entity";
import {
  EndOfLifeApplicationDto,
  EndOfLifeFiltersDto,
} from "./dto/end-of-life.dto";
import { EndOfLifeService } from "./end-of-life.service";

/**
 * #2801 : la capacité globale TechnologyList ouvre la vue transverse ;
 * TechnologyRead reste réservé aux fiches applicatives. Le service borne la
 * requête au périmètre du principal effectif, y compris en délégation.
 */
@ApiTags("Technologies")
@Controller("technologies")
@UseGuards(PermissionGuard)
export class EndOfLifeController {
  constructor(private readonly endOfLifeService: EndOfLifeService) {}

  @Get("end-of-life")
  @RequiredPermissions([Permission.TechnologyList])
  @ApiOperation({
    summary: "Technologies utilisées par les applications, fins de vie ou non",
    description:
      "Vue transverse accessible avec la capacité TechnologyList aux lecteurs, contributeurs et administrateurs. Les applications sont limitées au périmètre fonctionnel de l'utilisateur lorsqu'il en possède un. Par défaut, la liste retient celles dont au moins une technologie est en fin de vie, proche de sa fin de vie (moins de 6 mois) ou sortie du support actif. Filtrable par statut (`eol`, `eol-soon`, `eoas-passed`, partitionnant), par organisation et par recherche libre. Le filtre `all` inclut les technologies saines sans élargir le périmètre autorisé.",
  })
  @ApiOkResponse({
    description: "Liste paginée des applications concernées",
    type: PaginatedResponseDto.of(EndOfLifeApplicationDto),
  })
  @ApiForbiddenResponse({
    description: "Capacité Technologie absente, rôle ou périmètre non autorisé",
  })
  async findEndOfLifeApplications(
    @Query() filters: EndOfLifeFiltersDto,
    @User() requestor: Requestor,
  ) {
    return this.endOfLifeService.findApplications(filters, requestor);
  }
}
