import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { MetadatasService } from "../metadatas/metadatas.service";
import { MetadataAction } from "@prisma/client";
import {
  IDataCatalogRepository,
  IDataCatalogRepositoryToken,
} from "./infrastructure/data-catalog.repository.interface";
import {
  CreateDataApplicationDto,
  CreateDataExposureDto,
} from "./dto/create-data-application.dto";

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

  async findAllDescriptions(page: number, pageSize: number, name?: string) {
    return this.repository.findAllDescriptions(page, pageSize, name);
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
    sortBy?: string,
  ) {
    return this.repository.findByApplicationId(
      applicationId,
      page,
      pageSize,
      order,
      sortBy,
    );
  }

  async createApplicationData(
    applicationId: string,
    dto: CreateDataApplicationDto,
    userId: string,
  ) {
    const created = await this.repository.createApplicationData(
      applicationId,
      dto,
    );

    await this.metadataService.create({
      action: MetadataAction.add,
      description: `Ajout donnée applicative: ${dto.dataDescriptionId}`,
      createdById: userId,
      applicationId,
      dataApplicationId: created.id,
    });

    return created;
  }

  async updateApplicationData(
    applicationId: string,
    dataApplicationId: string,
    dto: Partial<CreateDataApplicationDto>,
    userId: string,
  ) {
    const updated = await this.repository.updateApplicationData(
      applicationId,
      dataApplicationId,
      dto,
    );
    if (!updated) throw new NotFoundException();

    await this.metadataService.create({
      action: MetadataAction.update,
      description: `Update donnée applicative ${dataApplicationId}`,
      createdById: userId,
      applicationId,
      dataApplicationId,
    });

    return updated;
  }

  async deleteApplicationData(
    applicationId: string,
    dataApplicationId: string,
    userId: string,
  ) {
    const deleted = await this.repository.deleteApplicationData(
      applicationId,
      dataApplicationId,
    );
    if (!deleted) throw new NotFoundException();

    await this.metadataService.create({
      action: MetadataAction.delete,
      description: `Delete donnée applicative ${dataApplicationId}`,
      createdById: userId,
      applicationId,
    });
  }

  // =====================================================
  // DATA EXPOSURE
  // =====================================================

  async createExposure(
    applicationId: string,
    dataApplicationId: string,
    dto: CreateDataExposureDto,
    userId: string,
  ) {
    const created = await this.repository.createExposure(
      applicationId,
      dataApplicationId,
      dto,
    );
    if (!created) throw new NotFoundException();

    await this.metadataService.create({
      action: MetadataAction.add,
      description: `Ajout exposition sur la donnée applicative ${dataApplicationId}`,
      createdById: userId,
      applicationId,
      dataApplicationId,
    });

    return created;
  }

  async updateExposure(
    applicationId: string,
    dataApplicationId: string,
    exposureId: string,
    dto: Partial<CreateDataExposureDto>,
    userId: string,
  ) {
    const updated = await this.repository.updateExposure(
      applicationId,
      dataApplicationId,
      exposureId,
      dto,
    );
    if (!updated) throw new NotFoundException();

    await this.metadataService.create({
      action: MetadataAction.update,
      description: `Update exposition ${exposureId}`,
      createdById: userId,
      applicationId,
      dataApplicationId,
    });

    return updated;
  }

  async deleteExposure(
    applicationId: string,
    dataApplicationId: string,
    exposureId: string,
    userId: string,
  ) {
    const deleted = await this.repository.deleteExposure(
      applicationId,
      dataApplicationId,
      exposureId,
    );
    if (!deleted) throw new NotFoundException();

    await this.metadataService.create({
      action: MetadataAction.delete,
      description: `Delete exposition ${exposureId}`,
      createdById: userId,
      applicationId,
      dataApplicationId,
    });
  }
}
