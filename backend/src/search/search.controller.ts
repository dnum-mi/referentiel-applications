import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApplicationSearchService } from './search.service';
import { SearchApplicationDto } from './application/dto/search-application.dto';

@ApiTags('Recherche Application')
@Controller('search/applications')
export class ApplicationSearchController {
  constructor(private readonly searchService: ApplicationSearchService) {}

  @Get()
  async search(@Query() dto: SearchApplicationDto) {
    return this.searchService.search(dto);
  }
}
