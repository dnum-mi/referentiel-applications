import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiNoContentResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Permission } from "@prisma/client";
import { PermissionGuard } from "src/common/guards/permission.guard";
import { RequiredPermissions } from "src/common/decorators/required-permissions.decorator";
import { EmailDigestCronService } from "./cron/email-cron.service";

@ApiTags("email")
@UseGuards(PermissionGuard)
@Controller("email")
export class EmailController {
  constructor(
    private readonly emailDigestCronService: EmailDigestCronService,
  ) {}

  /** Déclenche manuellement le digest des abonnés (ops + tests e2e). Admin uniquement. */
  @Post("digest")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Exécute le digest email des abonnés (admin)" })
  @ApiNoContentResponse({ description: "Digest déclenché" })
  @RequiredPermissions([Permission.AdminPanelManage])
  async runDigest(@Query("day") day?: "today" | "yesterday"): Promise<void> {
    const target = day === "today" ? new Date() : undefined;
    await this.emailDigestCronService.sendDailyDigest(target);
  }
}
