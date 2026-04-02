import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { HostingsService } from "./hostings.service";

@ApiTags("Sites")
@Controller("sites")
export class SitesController {
  constructor(private readonly hostingService: HostingsService) {}

  @Get()
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
