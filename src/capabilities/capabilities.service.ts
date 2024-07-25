import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { Pagination } from 'src/global-dto/pagination.dto';
import { Capability } from './entities/capability.entity';
import { CreateCapabilityDto } from './dto/create-capability.dto';
import { UpdateCapabilityDto } from './dto/update-capability.dto';
import { EnvironmentVariablesService } from '../environment-variables/environment-variables.service';

@Injectable()
export class CapabilitiesService {
  constructor(
    private prisma: PrismaService,
    private readonly env: EnvironmentVariablesService,
  ) {}

  async getAllBy(
    filters: Partial<{
      searchQuery: string;
      currentPage: number;
      maxPerPage: number;
      applicationId: string;
    }>,
  ): Promise<Pagination<Capability>> {
    const maxPerPage = Math.min(filters.maxPerPage ?? this.env.MaxPerPage, 100);
    const pageNumber = Math.max(filters.currentPage ?? 1, 1);
    const skip = (pageNumber - 1) * maxPerPage;

    const where: Prisma.FctCapabilityWhereInput = {
      OR: [
        filters.applicationId
          ? { applicationid: filters.applicationId }
          : undefined,

        filters.searchQuery
          ? {
              OR: [
                {
                  fctCapabilityrealisation: {
                    some: {
                      applicationid: filters.applicationId,
                    },
                  },
                },
                {
                  label: {
                    contains: filters.searchQuery,
                    mode: 'insensitive',
                  },
                },
                {
                  description: {
                    contains: filters.searchQuery,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : undefined,
      ].filter(Boolean) as Prisma.FctCapabilityWhereInput[], // Remove undefined values
    };

    if (where.OR?.length === 0) delete where.OR;

    const [count, capabilities] = await this.prisma.$transaction([
      this.prisma.fctCapability.count({ where }),
      this.prisma.fctCapability.findMany({
        include: {},
        skip,
        take: maxPerPage,

        where,
      }),
    ]);

    const totalPages = Math.ceil(count / maxPerPage);

    return {
      maxPerPage,
      currentPage: pageNumber,
      totalCount: count,
      totalPages,
      data: capabilities,
    };
  }

  async getOneById(id: string): Promise<Capability | null> {
    return this.prisma.fctCapability.findUnique({
      where: {
        capabilityid: id,
      },
    });
  }

  async create(
    username: string,
    data: CreateCapabilityDto,
  ): Promise<Capability> {
    return this.prisma.fctCapability.create({
      data: {
        ...data,
        ...{
          createdby: username,
          updatedby: username,
        },
      },
    });
  }

  async updateOneById(
    username: string,
    capabilityid: string,
    data: UpdateCapabilityDto,
  ): Promise<Capability> {
    return this.prisma.fctCapability.update({
      data: {
        ...data,
        ...{ updatedby: username },
      },
      where: {
        capabilityid,
      },
    });
  }
}
