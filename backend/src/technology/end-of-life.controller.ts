import { Controller, Get, Query } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { PaginatedResponseDto } from "src/common/dto";
import {
  EndOfLifeApplicationDto,
  EndOfLifeFiltersDto,
} from "./dto/end-of-life.dto";
import { EndOfLifeService } from "./end-of-life.service";

/**
 * Vue transverse des fins de vie (#2236).
 *
 * **Pas de `@RequiredPermissions`**, à l'image du contrôleur global
 * `/metadatas` : `TechnologyRead` n'existe qu'À L'ÉCHELLE D'UNE APPLICATION
 * (`READ_APP_PERMISSIONS`), et `PermissionGuard` ne sait la résoudre qu'à partir
 * d'un `:applicationId` dans la route. L'exiger ici la refuserait à tout le
 * monde ; l'ajouter au socle global la donnerait à un lecteur scopé sur les
 * applications HORS de son périmètre, puisque la projection de rôle est, elle,
 * conditionnée au périmètre — l'inverse du resserrement acté en #2230.
 *
 * La page suit donc le précédent des vues transverses du projet : ouverte à
 * tout utilisateur authentifié. Si l'équipe juge la donnée trop sensible pour
 * cette ouverture, le geste juste n'est pas de détourner une permission
 * existante mais d'en introduire une dédiée, globale, portée par les rôles
 * lecteur et au-delà.
 */
@ApiTags("Technologies")
@Controller("technologies")
export class EndOfLifeController {
  constructor(private readonly endOfLifeService: EndOfLifeService) {}

  @Get("end-of-life")
  @ApiOperation({
    summary: "Applications concernées par une technologie en fin de vie",
    description:
      "Vue transverse des fins de vie (#2236) : liste paginée des applications dont au moins une technologie est en fin de vie, proche de sa fin de vie (moins de 6 mois) ou sortie du support actif. Filtrable par statut, par organisation et par recherche libre. Seules les technologies retenues par le filtre sont restituées, triées par gravité décroissante.",
  })
  @ApiOkResponse({
    description: "Liste paginée des applications concernées",
    type: PaginatedResponseDto.of(EndOfLifeApplicationDto),
  })
  async findEndOfLifeApplications(@Query() filters: EndOfLifeFiltersDto) {
    return this.endOfLifeService.findApplications(filters);
  }
}
