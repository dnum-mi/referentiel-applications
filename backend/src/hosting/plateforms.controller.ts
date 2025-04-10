import { Controller, Get } from '@nestjs/common';
import { HostingService } from './hosting.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Plateformes')
@Controller('platforms')
export class PlatformsController {
  constructor(private readonly hostingService: HostingService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des plateformes existantes' })
  @ApiResponse({
    status: 200,
    description: 'Liste des plateformes',
    type: [String],
  })
  findPlatforms(): Promise<string[]> {
    return this.hostingService.findDistinctPlatforms();
  }
}
