import {
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { Permission } from "@prisma/client";
import { RequiredPermissions } from "src/common/decorators/required-permissions.decorator";
import { UserId } from "src/common/decorators/user-id.decorator";
import { PermissionGuard } from "src/common/guards/permission.guard";
import { PaginatedResponseDto } from "src/common/dto";
import {
  CorrelationSuggestionDto,
  CorrelationSuggestionFilterDto,
  RunCorrelationDetectionResultDto,
} from "./application/dto/correlation-suggestion.dto";
import { CorrelationSuggestionService } from "./correlation-suggestion.service";

/**
 * Revue des suggestions de corrélation produites par le moteur de détection
 * (#2281). Réservé à l'admin panel (permission AdminPanelManage — choix à
 * confirmer avec l'équipe, cf. question ouverte de l'épopée).
 */
@ApiTags("correlation-suggestions")
@UseGuards(PermissionGuard)
@Controller("correlation-suggestions")
export class CorrelationSuggestionController {
  constructor(
    private readonly correlationSuggestionService: CorrelationSuggestionService,
  ) {}

  @Get()
  @RequiredPermissions([Permission.AdminPanelManage])
  @ApiOperation({
    summary: "Lister les suggestions de corrélation",
    description:
      "Liste paginée des suggestions de corrélation entre applications, filtrable par statut (PENDING/ACCEPTED/REJECTED) et triée par score décroissant par défaut.",
  })
  @ApiOkResponse({
    description: "Liste paginée des suggestions de corrélation",
    type: PaginatedResponseDto.of(CorrelationSuggestionDto),
  })
  findAll(
    @Query() filters: CorrelationSuggestionFilterDto,
  ): Promise<PaginatedResponseDto<CorrelationSuggestionDto>> {
    return this.correlationSuggestionService.find(filters);
  }

  @Post("run")
  @RequiredPermissions([Permission.AdminPanelManage])
  @HttpCode(200)
  @ApiOperation({
    summary: "Lancer la détection des corrélations",
    description:
      "Déclenche manuellement le moteur de détection (sinon exécuté par le job planifié). Les exécutions sont sérialisées : 409 si une détection est déjà en cours.",
  })
  @ApiOkResponse({
    description: "Détection exécutée",
    type: RunCorrelationDetectionResultDto,
  })
  @ApiConflictResponse({ description: "Une détection est déjà en cours" })
  run(): Promise<RunCorrelationDetectionResultDto> {
    return this.correlationSuggestionService.runDetection();
  }

  @Post(":id/accept")
  @RequiredPermissions([Permission.AdminPanelManage])
  @HttpCode(200)
  @ApiOperation({
    summary: "Accepter une suggestion de corrélation",
    description:
      "Crée la relation is_correlated_with entre les deux applications (avec traçabilité Metadata sur les deux fiches) et passe la suggestion en ACCEPTED.",
  })
  @ApiParam({ name: "id", description: "Identifiant de la suggestion" })
  @ApiOkResponse({
    description: "Suggestion acceptée, relation créée",
    type: CorrelationSuggestionDto,
  })
  @ApiNotFoundResponse({ description: "Suggestion non trouvée" })
  @ApiConflictResponse({ description: "Suggestion déjà revue" })
  accept(
    @Param("id") id: string,
    @UserId() userId: string,
  ): Promise<CorrelationSuggestionDto> {
    return this.correlationSuggestionService.accept(id, userId);
  }

  @Post(":id/reject")
  @RequiredPermissions([Permission.AdminPanelManage])
  @HttpCode(200)
  @ApiOperation({
    summary: "Rejeter une suggestion de corrélation",
    description:
      "Passe la suggestion en REJECTED sans créer de relation ; la paire ne sera plus re-proposée par le moteur.",
  })
  @ApiParam({ name: "id", description: "Identifiant de la suggestion" })
  @ApiOkResponse({
    description: "Suggestion rejetée",
    type: CorrelationSuggestionDto,
  })
  @ApiNotFoundResponse({ description: "Suggestion non trouvée" })
  @ApiConflictResponse({ description: "Suggestion déjà revue" })
  reject(
    @Param("id") id: string,
    @UserId() userId: string,
  ): Promise<CorrelationSuggestionDto> {
    return this.correlationSuggestionService.reject(id, userId);
  }
}
