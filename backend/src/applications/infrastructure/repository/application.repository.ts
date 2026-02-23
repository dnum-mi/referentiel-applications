import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { CreateApplicationDto } from "src/applications/dto/create-application.dto";
import { ApplicationSearchResultDto } from "src/applications/dto/get-application.dto";
import { TechnicalDebtPointDto } from "src/applications/dto/technical-debt-point.dto";
import { ApplicationWithAllRelations } from "src/applications/types/application.type";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateTagDto } from "src/tag/dto/tag.dto";
import {
  ApplicationSearchFilters,
  IApplicationRepository,
} from "./application.repository.interface";

@Injectable()
export class ApplicationRepository implements IApplicationRepository {
  constructor(private prisma: PrismaService) {}

  public async create(
    application: Omit<CreateApplicationDto, "status" | "labels">,
    existingTags: CreateTagDto[],
  ) {
    return this.prisma.application.create({
      data: {
        ...application,
        tags: {
          connect: existingTags,
        },
        labels: undefined,
        quality: 0,
      },
      include: {
        tags: true,
      },
    });
  }

  public async findById(id: string) {
    return this.prisma.application.findUnique({
      where: { id },
      include: {
        currentStatus: true, // Include the current status via FK
        relationsAsSource: {
          include: { targetApplication: { select: { id: true, label: true } } },
        },
        relationsAsTarget: {
          include: { sourceApplication: { select: { id: true, label: true } } },
        },
        tags: true,
        businessDivision: true,
      },
    });
  }

  public async findApplications(
    filters: ApplicationSearchFilters,
    where: Prisma.ApplicationWhereInput,
    orderBy: Prisma.ApplicationOrderByWithRelationInput,
  ): Promise<ApplicationSearchResultDto> {
    const { page, pageSize } = filters;

    const since = new Date();
    since.setMonth(since.getMonth() - 12);

    const paginatedResult = await this.prisma.application.paginate({
      where,
      orderBy,
      page,
      pageSize,
      include: {
        currentStatus: true,
        technicalDebtInfo: true,
        hostings: {
          include: {
            hostingOption: true,
          },
        },
        actors: {
          include: {
            organization: {
              select: { id: true, path: true, sigle: true },
            },
            actorType: true,
          },
        },
        compliance: true,
        labels: true,
        externalRessource: true,
        tags: true,
        _count: {
          select: {
            applicationViews: {
              where: {
                createdAt: { gte: since },
              },
            },
          },
        },
      },
    });

    // Calculate average IQ across all matching applications (not just paginated results)
    const avgResult = await this.prisma.application.aggregate({
      where,
      _avg: {
        quality: true,
      },
    });

    // Prisma decimal extension returns runtime numbers, so we cast to API DTOs.
    return {
      ...paginatedResult,
      averageIq: avgResult._avg.quality ?? 0,
    } as unknown as ApplicationSearchResultDto;
  }

  public async findTechnicalDebtPoints(
    where: Prisma.ApplicationWhereInput,
    orderBy: Prisma.ApplicationOrderByWithRelationInput,
  ): Promise<TechnicalDebtPointDto[]> {
    const results = await this.prisma.application.findMany({
      where,
      orderBy,
      select: {
        id: true,
        label: true,
        shortName: true,
        technicalDebtInfo: {
          select: {
            technicalMaturity: true,
            businessMaturity: true,
            costMaturity: true,
          },
        },
      },
    });

    // Prisma decimal extension returns runtime numbers, so we cast to API DTOs.
    return results as unknown as TechnicalDebtPointDto[];
  }

  async findAllWithFullRelations(): Promise<ApplicationWithAllRelations[]> {
    return await this.prisma.application.findMany({
      include: {
        currentStatus: true,
        metadatas: true,
        compliance: true,
        labels: {
          include: {
            labelSource: true,
          },
        },
        tags: true,
        externalRessource: true,
        reports: true,
        statuses: true,
        actors: {
          include: {
            actorType: true,
          },
        },
        hostings: {
          include: {
            hostingOption: true,
          },
        },
        relationsAsSource: {
          include: { targetApplication: true },
        },
        relationsAsTarget: {
          include: { sourceApplication: true },
        },
      },
    });
  }

  public async delete(id: string): Promise<void> {
    await this.prisma.application.delete({
      where: { id },
    });
  }
}
