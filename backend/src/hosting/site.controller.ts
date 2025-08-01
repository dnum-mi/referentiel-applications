import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { HostingService } from "./hosting.service";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AdminGuard } from "src/common/guards/admin.guard";
import { RequiredAdminLevel } from "src/common/decorators/admin.decorator";
import { AdminLevel } from "src/user/entities/user.entity";

@ApiTags("Sites")
@UseGuards(AdminGuard)
@Controller("sites")
export class SitesController {
  constructor(private readonly hostingService: HostingService) {}

  @Get()
  @RequiredAdminLevel(AdminLevel.NONE)
  @ApiOperation({ summary: "Liste des sites distincts existants" })
  @ApiResponse({ status: 200, description: "Liste des sites", type: [String] })
  findDistinctSites(): Promise<string[]> {
    return this.hostingService.findDistinctSites();
  }

  @Get(":site/applications")
  @ApiOperation({ summary: "Récupérer les applications associées à un site" })
  @ApiResponse({
    status: 200,
    description: "Liste des applications pour le site",
  })
  findApplications(@Param("site") site: string) {
    return this.hostingService.findApplicationsBySite(site);
  }
}
