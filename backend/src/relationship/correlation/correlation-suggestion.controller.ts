import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Permission } from "@prisma/client";
import { RequiredPermissions } from "src/common/decorators/required-permissions.decorator";
import { PermissionGuard } from "src/common/guards/permission.guard";
import { PaginatedResponseDto } from "src/common/dto";
import {
  CorrelationSuggestionDto,
  CorrelationSuggestionFilterDto,
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
}
