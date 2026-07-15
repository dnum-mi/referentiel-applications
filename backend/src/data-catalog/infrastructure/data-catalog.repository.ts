import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CreateDataApplicationDto,
  CreateDataExposureDto,
} from "../dto/create-data-application.dto";
import { IDataCatalogRepository } from "./data-catalog.repository.interface";

function buildDataApplicationOrderBy(
  sortBy: string | undefined,
  order: "asc" | "desc",
): Prisma.DataApplicationOrderByWithRelationInput {
  switch (sortBy) {
    case "family":
      return { dataDescription: { family: { path: order } } };
    case "sensibility":
      return { sensibility: { label: order } };
    case "openDataStatus":
      return { openDataStatus: order };
    case "isReference":
      return { isReference: order };
    case "tags":
      return { dataDescription: { tags: { _count: order } } };
    case "name":
    default:
      return { dataDescription: { name: order } };
  }
}

@Injectable()
export class DataCatalogPrismaRepository implements IDataCatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  // =====================================================
  // DATA DESCRIPTION
  // =====================================================

  async createDescription(dto: any) {
    return this.prisma.dataDescription.create({
      data: {
        name: dto.name,
        description: dto.description,
        familyId: dto.familyId,
        officialUrl: dto.officialUrl,
        tags: dto.tagIds
          ? {
              connect: dto.tagIds.map((id: string) => ({ id })),
            }
          : undefined,
      },
      include: {
        family: true,
        tags: true,
      },
    });
  }

  async findAllDescriptions(page: number, pageSize: number, name?: string) {
    return this.prisma.dataDescription.findMany({
      skip: page * pageSize,
      take: pageSize,
      where: name
        ? { name: { contains: name, mode: "insensitive" } }
        : undefined,
      include: {
        family: true,
        tags: true,
      },
      orderBy: {
        name: "asc",
      },
    });
  }

  async findDescriptionById(id: string) {
    return this.prisma.dataDescription.findUnique({
      where: { id },
      include: {
        family: true,
        tags: true,
        dataApplications: {
          include: {
            application: {
              select: { id: true, label: true },
            },
          },
        },
      },
    });
  }

  async updateDescription(id: string, dto: any) {
    return this.prisma.dataDescription.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        familyId: dto.familyId,
        officialUrl: dto.officialUrl,
        tags: dto.tagIds
          ? {
              set: [],
              connect: dto.tagIds.map((id: string) => ({ id })),
            }
          : undefined,
      },
      include: {
        family: true,
        tags: true,
      },
    });
  }

  async deleteDescription(id: string) {
    await this.prisma.dataDescription.delete({
      where: { id },
    });
  }

  async findOneApplicationData(
    applicationId: string,
    dataApplicationId: string,
  ) {
    return this.prisma.dataApplication.findFirst({
      where: {
        id: dataApplicationId,
        applicationId,
      },
      include: {
        sensibility: true,
        exposures: true,
        dataDescription: {
          include: {
            family: true,
            tags: true,
            dataApplications: {
              include: {
                sensibility: true,
                exposures: true,
                application: {
                  select: {
                    id: true,
                    label: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async findByApplicationId(
    applicationId: string,
    page: number,
    pageSize: number,
    order: "asc" | "desc" = "asc",
    sortBy?: string,
  ) {
    return this.prisma.dataApplication.paginate({
      where: { applicationId },
      include: {
        dataDescription: {
          include: {
            family: true,
            tags: true,
          },
        },
        sensibility: true,
        exposures: true,
      },
      orderBy: buildDataApplicationOrderBy(sortBy, order),
      page,
      pageSize,
    });
  }

  private static readonly applicationDataInclude = {
    dataDescription: {
      include: {
        family: true,
        tags: true,
      },
    },
    sensibility: true,
    exposures: true,
  };

  async createApplicationData(
    applicationId: string,
    dto: CreateDataApplicationDto,
  ) {
    return this.prisma.dataApplication.create({
      data: {
        applicationId,
        dataDescriptionId: dto.dataDescriptionId,
        sensibilityId: dto.sensibilityId,
        example: dto.example,
        openDataStatus: dto.openDataStatus,
        isReference: dto.isReference,
        businessUsage: dto.businessUsage,
        documentationUrl: dto.documentationUrl,
        volumetry: dto.volumetry,
        monthlyVolumetry: dto.monthlyVolumetry,
        updateFrequency: dto.updateFrequency,
        conservation: dto.conservation,
      },
      include: DataCatalogPrismaRepository.applicationDataInclude,
    });
  }

  async updateApplicationData(
    applicationId: string,
    dataApplicationId: string,
    dto: Partial<CreateDataApplicationDto>,
  ) {
    const result = await this.prisma.dataApplication.updateMany({
      where: { id: dataApplicationId, applicationId },
      data: {
        dataDescriptionId: dto.dataDescriptionId,
        sensibilityId: dto.sensibilityId,
        example: dto.example,
        openDataStatus: dto.openDataStatus,
        isReference: dto.isReference,
        businessUsage: dto.businessUsage,
        documentationUrl: dto.documentationUrl,
        volumetry: dto.volumetry,
        monthlyVolumetry: dto.monthlyVolumetry,
        updateFrequency: dto.updateFrequency,
        conservation: dto.conservation,
      },
    });

    if (result.count === 0) return null;

    return this.prisma.dataApplication.findUnique({
      where: { id: dataApplicationId },
      include: DataCatalogPrismaRepository.applicationDataInclude,
    });
  }

  async deleteApplicationData(
    applicationId: string,
    dataApplicationId: string,
  ) {
    const result = await this.prisma.dataApplication.deleteMany({
      where: { id: dataApplicationId, applicationId },
    });

    return result.count > 0;
  }

  // =====================================================
  // DATA EXPOSURE
  // =====================================================

  async createExposure(
    applicationId: string,
    dataApplicationId: string,
    dto: CreateDataExposureDto,
  ) {
    const owner = await this.prisma.dataApplication.findFirst({
      where: { id: dataApplicationId, applicationId },
      select: { id: true },
    });
    if (!owner) return null;

    return this.prisma.dataExposure.create({
      data: {
        applicationDataId: dataApplicationId,
        type: dto.type,
        url: dto.url,
        endpoint: dto.endpoint,
        format: dto.format,
        swaggerUrl: dto.swaggerUrl,
        authenticationType: dto.authenticationType,
      },
    });
  }

  async updateExposure(
    applicationId: string,
    dataApplicationId: string,
    exposureId: string,
    dto: Partial<CreateDataExposureDto>,
  ) {
    const result = await this.prisma.dataExposure.updateMany({
      where: {
        id: exposureId,
        applicationDataId: dataApplicationId,
        dataApplication: { applicationId },
      },
      data: {
        type: dto.type,
        url: dto.url,
        endpoint: dto.endpoint,
        format: dto.format,
        swaggerUrl: dto.swaggerUrl,
        authenticationType: dto.authenticationType,
      },
    });

    if (result.count === 0) return null;

    return this.prisma.dataExposure.findUnique({ where: { id: exposureId } });
  }

  async deleteExposure(
    applicationId: string,
    dataApplicationId: string,
    exposureId: string,
  ) {
    const result = await this.prisma.dataExposure.deleteMany({
      where: {
        id: exposureId,
        applicationDataId: dataApplicationId,
        dataApplication: { applicationId },
      },
    });

    return result.count > 0;
  }
}
