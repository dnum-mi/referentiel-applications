import { IHostingRepository } from './infrastructure/repository/hosting.repository.interface';
import { Inject, Injectable } from '@nestjs/common';
import { CreateHostingDto } from './applications/dto/create-hosting.dto';
import { UpdateHostingDto } from './applications/dto/update-hosting.dto';
import { Hosting } from './domain/hosting.entity';

@Injectable()
export class HostingService {
  constructor(
    @Inject('IHostingRepository')
    private readonly repository: IHostingRepository,
  ) {}

  create(dto: CreateHostingDto, ownerId: string) {
    return this.repository.create(dto, ownerId);
  }

  findAll() {
    return this.repository.findAll();
  }

  findOne(id: string) {
    return this.repository.findById(id);
  }

  findDistinctSites(): Promise<string[]> {
    return this.repository.findDistinctSites();
  }

  update(id: string, dto: UpdateHostingDto, ownerId: string) {
    return this.repository.update(id, dto, ownerId);
  }

  remove(id: string, ownerId?: string) {
    return this.repository.delete(id, ownerId);
  }

  findApplicationsBySite(site: string) {
    return this.repository.findApplicationsBySite(site);
  }

  async findByApplicationId(applicationId: string): Promise<Hosting[]> {
    return this.repository.findByApplicationId(applicationId);
  }
}
