import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { IDataCatalogRepository } from "./data-catalog.repository.interface";

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

  async findAllDescriptions(page: number, pageSize: number) {
    return this.prisma.dataDescription.findMany({
      skip: page * pageSize,
      take: pageSize,
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
      orderBy: { dataDescription: { name: order } },
      page,
      pageSize,
    });
  }
}
