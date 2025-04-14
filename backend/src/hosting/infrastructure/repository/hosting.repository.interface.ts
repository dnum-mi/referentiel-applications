import { CreateHostingDto } from 'src/hosting/applications/dto/create-hosting.dto';
import { UpdateHostingDto } from 'src/hosting/applications/dto/update-hosting.dto';
import { Hosting } from 'src/hosting/domain/hosting.entity';

export const IHostingRepository = 'IHostingRepository';

export interface IHostingRepository {
  create(data: CreateHostingDto): Promise<Hosting>;
  findAll(): Promise<Hosting[]>;
  findById(id: string): Promise<Hosting | null>;
  update(id: string, data: UpdateHostingDto): Promise<Hosting>;
  delete(id: string): Promise<void>;
  findBySite(site: string): Promise<Hosting[]>;
  findApplicationsBySite(site: string): Promise<Hosting[]>;
  findDistinctSites(): Promise<string[]>;
  findByApplicationId(applicationId: string): Promise<Hosting[]>;
}
