import type { Prisma } from "@prisma/client";
import { Injectable } from "@nestjs/common";
import { paginate } from "src/common/utils/pagination.utils";
import { PrismaService } from "src/prisma/prisma.service";
import { MetadataFiltersDto, MetadataPaginatedResponseDto } from "../dto/metadata.dto";
import { IMetadataRepository } from "./metadata.repository.interface";

@Injectable()
export class MetadataRepository implements IMetadataRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  public async findAll(filters?: MetadataFiltersDto & { applicationId?: string }): Promise<MetadataPaginatedResponseDto> {
    const where: Prisma.MetadataWhereInput = {};

    if (filters?.applicationId) {
      where.applicationId = filters.applicationId;
    }

    if (filters?.createdAtGte || filters?.createdAtLte) {
      where.createdAt = {};
      if (filters.createdAtGte) {
        where.createdAt.gte = new Date(filters.createdAtGte);
      }
      if (filters.createdAtLte) {
        where.createdAt.lte = new Date(filters.createdAtLte);
      }
    }

    // Handle sorting
    let orderBy: any = { createdAt: "desc" }; // Default sort

    if (filters?.sortBy) {
      const order = filters.order || "desc";

      switch (filters.sortBy) {
        case "application.label":
          orderBy = { application: { label: order } };
          break;
        case "createdBy.email":
          orderBy = { createdBy: { email: order } };
          break;
        case "createdBy.organization.path":
          orderBy = { createdBy: { organization: { path: order } } };
          break;
        case "action":
        case "createdAt":
          orderBy = { [filters.sortBy]: order };
          break;
        default:
          orderBy = { createdAt: order };
      }
    }

    const results = await this.prisma.metadata.findMany({
      where,
      ...paginate(filters?.page, filters?.pageSize),
      orderBy,
      include: {
        createdBy: {
          include: {
            organization: true,
          },
        },
        application: {
          select: { id: true, label: true },
        },
      },
    });

    return new MetadataPaginatedResponseDto(results, await this.prisma.metadata.count({ where }));
  }

  async findFirstAndLastByApplicationId(applicationId: string) {
    const [first, last] = await this.prisma.$transaction([
      this.prisma.metadata.findFirst({
        where: { applicationId },
        orderBy: { createdAt: "asc" },
        include: {
          createdBy: {
            include: {
              organization: true,
            },
          },
        },
      }),
      this.prisma.metadata.findFirst({
        where: { applicationId },
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: {
            include: {
              organization: true,
            },
          },
        },
      }),
    ]);

    return { first, last };
  }

  findOne(id: string) {
    return this.prisma.metadata.findUnique({
      where: { id },
      include: {
        createdBy: {
          include: {
            organization: true,
          },
        },
        application: {
          select: { id: true, label: true },
        },
      },
    });
  }
}
