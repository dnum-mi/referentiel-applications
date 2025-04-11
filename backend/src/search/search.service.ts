import { Inject, Injectable } from '@nestjs/common';
import { IApplicationSearchRepository } from './infrastructure/search.repository.interface';
import { SearchApplicationDto } from './application/dto/search-application.dto';

@Injectable()
export class ApplicationSearchService {
  constructor(
    @Inject('IApplicationSearchRepository')
    private readonly repository: IApplicationSearchRepository,
  ) {}

  async search(dto: SearchApplicationDto) {
    return this.repository.findApplicationsBySearch(dto);
  }
}
