import { SearchApplicationDto } from '../application/dto/search-application.dto';

export interface IApplicationSearchRepository {
  findApplicationsBySearch(dto: SearchApplicationDto): Promise<{
    results: any[];
    total: number;
  }>;
}
