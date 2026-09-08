import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Permission } from "@prisma/client";
import { RequiredPermissions } from "src/common/decorators/required-permissions.decorator";
import { PaginatedResponseDto } from "src/common/dto";
import { PermissionGuard } from "src/common/guards/permission.guard";
import { ActionLogService } from "./action-log.service";
import { ActionLogDto, ActionLogFiltersDto } from "./dto/action-log.dto";

/**
 * Consultation du journal centralisé des actions mutantes (#2224), pour
 * reconstituer ce qu'un admin a fait — y compris sous impersonation (#2061).
 * Réservé aux administrateurs : ce journal couvre TOUTES les routes mutantes
 * de l'application (acteurs, utilisateurs, permissions…), donc plus sensible
 * que l'historique `Metadata` (ouvert à tous les utilisateurs authentifiés).
 */
@ApiTags("ActionLogs")
@UseGuards(PermissionGuard)
@Controller("action-logs")
export class ActionLogController {
  constructor(private readonly actionLogService: ActionLogService) {}

  @Get()
  @ApiOperation({
    summary: "Liste le journal des actions mutantes (admin)",
  })
  @ApiOkResponse({
    description: "Liste paginée du journal des actions",
    type: PaginatedResponseDto.of(ActionLogDto),
  })
  @RequiredPermissions([Permission.GlobalAdminManage])
  findAll(@Query() filters: ActionLogFiltersDto) {
    return this.actionLogService.findAllPaginated(filters);
  }
}
