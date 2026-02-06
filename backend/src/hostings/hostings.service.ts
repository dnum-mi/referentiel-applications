import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ApplicationService } from "src/applications/application.service";
import { CreateHostingDto, UpdateHostingDto } from "./dto/hosting.dto";
import { Hosting } from "./entities/hosting.entity";
import { IHostingRepository } from "./infrastructure/repository/hosting.repository.interface";
import { MetadatasService } from "src/metadatas/metadatas.service";

@Injectable()
export class HostingsService {
  constructor(
    @Inject("IHostingRepository")
    private readonly repository: IHostingRepository,
    private readonly applicationService: ApplicationService,
    private readonly metadataService: MetadatasService,
  ) {}

  async create(dto: CreateHostingDto, requestorId: string) {
    const createdHosting = await this.repository.create(dto);
    await this.applicationService.updateApplicationQuality(dto.applicationId);
    await this.metadataService.createMetadata({
      applicationId: dto.applicationId,
      createdById: requestorId,
      entity: "hostingId",
      entityId: createdHosting.id,
      title: `de l'hébergement : ${createdHosting.label}`,
      type: "add",
    });
    return createdHosting;
  }

  async count(): Promise<number> {
    return this.repository.count();
  }

  findAll() {
    return this.repository.findAll();
  }

  async findOne(id: string) {
    const hosting = await this.repository.findById(id);
    if (!hosting) {
      throw new NotFoundException(`Hébergement non trouvé pour l'ID ${id}`);
    }
    return hosting;
  }

  findDistinctSites(): Promise<string[]> {
    return this.repository.findDistinctSites();
  }

  async update(id: string, dto: UpdateHostingDto, requestorId: string) {
    const oldHosting = await this.findOne(id);
    const updatedHosting = await this.repository.update(id, dto);

    await this.applicationService.updateApplicationQuality(dto.applicationId);
    await this.metadataService.createMetadata({
      applicationId: dto.applicationId,
      createdById: requestorId,
      title: `de l'hébergement ${oldHosting.label}`,
      entity: "hostingId",
      entityId: id,
      fields: {
        label: "libellé",
        "hostingOption.site": "site",
        "hostingOption.platform": "plateforme",
        "hostingOption.provider": "fournisseur",
        "hostingOption.building": "bâtiment",
        "hostingOption.room": "pièce",
      },
      oldData: oldHosting,
      newData: updatedHosting,
    });
    return updatedHosting;
  }

  async remove(id: string, requestorId?: string) {
    const hosting = await this.repository.findById(id);

    await this.metadataService.createMetadata({
      applicationId: hosting.applicationId,
      createdById: requestorId,
      entity: "hostingId",
      entityId: hosting.id,
      title: `de l'hébergement : ${hosting.label}`,
      type: "delete",
    });

    return this.repository.delete(id);
  }

  async findByApplicationId(applicationId: string): Promise<Hosting[]> {
    return this.repository.findByApplicationId(applicationId);
  }
}
