import type { Metadata, Prisma } from "@prisma/client";
import { Injectable } from "@nestjs/common";
import { PaginatedResponseDto } from "src/common/dto";
import { PrismaService } from "src/prisma/prisma.service";
import { MetadataFiltersDto, MetadataDto } from "../dto/metadata.dto";
import { IMetadataRepository } from "./metadata.repository.interface";

@Injectable()
export class MetadataRepository implements IMetadataRepository {
  constructor(private readonly prisma: PrismaService) {}

  public async findAll(
    filters?: MetadataFiltersDto & { applicationId?: string },
  ): Promise<PaginatedResponseDto<MetadataDto>> {
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

    where.action = { not: "export" };

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
        case "description":
          orderBy = { [filters.sortBy]: order };
          break;
        default:
          orderBy = { createdAt: order };
      }
    }

    return this.prisma.metadata.paginate({
      where,
      page: filters?.page,
      pageSize: filters?.pageSize,
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

  create(data: Prisma.MetadataUncheckedCreateInput): Promise<Metadata> {
    return this.prisma.metadata.create({ data });
  }
}
