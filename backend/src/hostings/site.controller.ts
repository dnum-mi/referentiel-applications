import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { RequiredAdminLevel } from "src/common/decorators/admin.decorator";
import { AdminGuard } from "src/common/guards/admin.guard";
import { AdminLevel } from "src/user/entities/user.entity";
import { HostingsService } from "./hostings.service";

@ApiTags("Sites")
@UseGuards(AdminGuard)
@Controller("sites")
export class SitesController {
  constructor(private readonly hostingService: HostingsService) {}

  @Get()
  @RequiredAdminLevel(AdminLevel.NONE)
  @ApiOperation({ summary: "Liste des sites distincts existants" })
  @ApiOkResponse({
    description: "Liste des sites",
    type: String,
    isArray: true,
  })
  findDistinctSites(): Promise<string[]> {
    return this.hostingService.findDistinctSites();
  }
}
