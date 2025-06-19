import { IHostingRepository } from './infrastructure/repository/hosting.repository.interface';
import { Inject, Injectable } from '@nestjs/common';
import { CreateHostingDto } from './applications/dto/create-hosting.dto';
import { UpdateHostingDto } from './applications/dto/update-hosting.dto';
import { Hosting } from './domain/hosting.entity';
import { ApplicationQualityService } from 'src/product/quality.service';

@Injectable()
export class HostingService {
  constructor(
    @Inject('IHostingRepository')
    private readonly repository: IHostingRepository,
    private readonly applicationQualityService: ApplicationQualityService,
  ) {}

  async create(dto: CreateHostingDto, ownerId: string) {
    const createdHosting = this.repository.create(dto, ownerId);
    await this.applicationQualityService.updateApplicationQuality(
      dto.applicationId,
    );
    return createdHosting;
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

  async update(id: string, dto: UpdateHostingDto, ownerId: string) {
    const updatedHosting = await this.repository.update(id, dto, ownerId);
    await this.applicationQualityService.updateApplicationQuality(
      dto.applicationId,
    );
    return updatedHosting;
  }

  async remove(id: string, ownerId?: string) {
    const hosting = await this.repository.findById(id);
    const deletedHosting = await this.repository.delete(id, ownerId);
    await this.applicationQualityService.updateApplicationQuality(
      hosting.applicationId,
    );
    return deletedHosting;
  }

  findApplicationsBySite(site: string) {
    return this.repository.findApplicationsBySite(site);
  }

  async findByApplicationId(applicationId: string): Promise<Hosting[]> {
    return this.repository.findByApplicationId(applicationId);
  }
}
