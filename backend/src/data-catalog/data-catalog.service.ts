import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { MetadatasService } from "../metadatas/metadatas.service";
import { MetadataAction } from "@prisma/client";
import {
  IDataCatalogRepository,
  IDataCatalogRepositoryToken,
} from "./infrastructure/data-catalog.repository.interface";

@Injectable()
export class DataCatalogService {
  constructor(
    @Inject(IDataCatalogRepositoryToken)
    private readonly repository: IDataCatalogRepository,
    private readonly metadataService: MetadatasService,
  ) {}

  // =====================================================
  // DATA DESCRIPTION
  // =====================================================

  async createDescription(dto: any, userId: string) {
    const description = await this.repository.createDescription(dto);

    await this.metadataService.create({
      action: MetadataAction.add,
      description: `Création data description: ${dto.name}`,
      createdById: userId,
      dataDescriptionId: description.id,
    });

    return description;
  }

  async findAllDescriptions(page: number, pageSize: number) {
    return this.repository.findAllDescriptions(page, pageSize);
  }

  async findDescriptionById(id: string) {
    return this.repository.findDescriptionById(id);
  }

  async updateDescription(id: string, dto: any, userId: string) {
    const updated = await this.repository.updateDescription(id, dto);

    await this.metadataService.create({
      action: MetadataAction.update,
      description: `Update data description ${id}`,
      createdById: userId,
      dataDescriptionId: id,
    });

    return updated;
  }

  async deleteDescription(id: string, userId: string) {
    await this.repository.deleteDescription(id);

    await this.metadataService.create({
      action: MetadataAction.delete,
      description: `Delete data description ${id}`,
      createdById: userId,
    });
  }

  // =====================================================
  // APPLICATION DATA
  // =====================================================

  async findOneApplicationData(
    applicationId: string,
    dataApplicationId: string,
  ) {
    const result = await this.repository.findOneApplicationData(
      applicationId,
      dataApplicationId,
    );
    if (!result) throw new NotFoundException();
    return result;
  }

  async findByApplication(
    applicationId: string,
    page: number,
    pageSize: number,
    order?: "asc" | "desc",
  ) {
    return this.repository.findByApplicationId(
      applicationId,
      page,
      pageSize,
      order,
    );
  }
}
