import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Permission } from "@prisma/client";
import { PermissionGuard } from "src/common/guards/permission.guard";
import { RequiredPermissions } from "src/common/decorators/required-permissions.decorator";
import { PaginatedResponseDto, PaginationDto } from "src/common/dto";
import { EmailDigestCronService } from "./cron/email-cron.service";
import { EmailLogService } from "./email-log.service";
import { EmailLogDto } from "./dto/email-log.dto";

@ApiTags("email")
@UseGuards(PermissionGuard)
@Controller("email")
export class EmailController {
  constructor(
    private readonly emailDigestCronService: EmailDigestCronService,
    private readonly emailLogService: EmailLogService,
  ) {}

  /** Historique des e-mails effectivement envoyés par le système. Admin uniquement. */
  @Get("logs")
  @ApiOperation({
    summary: "Liste l'historique des e-mails envoyés (admin)",
  })
  @ApiOkResponse({
    description: "Liste paginée de l'historique des e-mails envoyés",
    type: PaginatedResponseDto.of(EmailLogDto),
  })
  @RequiredPermissions([Permission.GlobalAdminManage])
  async findLogs(
    @Query() filters: PaginationDto,
  ): Promise<PaginatedResponseDto<EmailLogDto>> {
    return this.emailLogService.findAllPaginated(filters);
  }

  /** Déclenche manuellement le digest des abonnés (ops + tests e2e). Admin uniquement. */
  @Post("digest")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Exécute le digest email des abonnés (admin)" })
  @ApiNoContentResponse({ description: "Digest déclenché" })
  @RequiredPermissions([Permission.GlobalAdminManage])
  async runDigest(@Query("day") day?: "today" | "yesterday"): Promise<void> {
    const target = day === "today" ? new Date() : undefined;
    await this.emailDigestCronService.sendDailyDigest(target);
  }
}
