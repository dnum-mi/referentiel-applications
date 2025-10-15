import { IHostingRepository } from "./infrastructure/repository/hosting.repository.interface";
import { Inject, Injectable } from "@nestjs/common";
import { Hosting } from "./domain/hosting.entity";
import { ApplicationService } from "src/product/application.service";
import { CreateHostingDto, UpdateHostingDto } from "./applications/dto/hosting.dto.js";

@Injectable()
export class HostingService {
  constructor(
    @Inject("IHostingRepository")
    private readonly repository: IHostingRepository,
    private readonly applicationService: ApplicationService,
  ) {}

  async create(dto: CreateHostingDto, requestorId: string) {
    const createdHosting = this.repository.create(dto, requestorId);
    await this.applicationService.updateApplicationQuality(dto.applicationId);
    return createdHosting;
  }

  async count(): Promise<number> {
    return this.repository.count();
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

  async update(id: string, dto: UpdateHostingDto, requestorId: string) {
    const updatedHosting = await this.repository.update(id, dto, requestorId);
    await this.applicationService.updateApplicationQuality(dto.applicationId);
    return updatedHosting;
  }

  async remove(id: string, requestorId?: string) {
    const hosting = await this.repository.findById(id);
    const deletedHosting = await this.repository.delete(id, requestorId);
    await this.applicationService.updateApplicationQuality(
      hosting.applicationId,
    );
    return deletedHosting;
  }

  async findByApplicationId(applicationId: string): Promise<Hosting[]> {
    return this.repository.findByApplicationId(applicationId);
  }
}
