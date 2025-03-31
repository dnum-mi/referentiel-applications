import { Controller, Get, Param } from '@nestjs/common';
import { HostingService } from './hosting.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Sites')
@Controller('sites')
export class SitesController {
  constructor(private readonly hostingService: HostingService) {}

  @Get('distinct')
  @ApiOperation({ summary: 'Liste des sites distincts existants' })
  @ApiResponse({ status: 200, description: 'Liste des sites', type: [String] })
  findDistinctSites(): Promise<string[]> {
    return this.hostingService.findDistinctSites();
  }

  @Get(':site/applications')
  @ApiOperation({ summary: 'Récupérer les applications associées à un site' })
  @ApiResponse({
    status: 200,
    description: 'Liste des applications pour le site',
  })
  findApplications(@Param('site') site: string) {
    return this.hostingService.findApplicationsBySite(site);
  }
}
