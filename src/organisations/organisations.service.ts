import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrgOrganisationunit, Prisma } from '@prisma/client';
import { Organisation } from './entities/organisation.entity';
import { Pagination } from '../global-dto/pagination.dto';
import { CreateOrganisationDto } from './dto/create-organisation.dto';
import { UpdateOrganisationDto } from './dto/update-organisation.dto';
import { EnvironmentVariablesService } from '../environment-variables/environment-variables.service';

@Injectable()
export class OrganisationsService {
  constructor(
    private prisma: PrismaService,
    private readonly env: EnvironmentVariablesService,
  ) {}

  async getAllBy(
    filters: Partial<{
      searchQuery?: string;
      currentPage: number;
      maxPerPage: number;
      parentId: string;
      label: string;
      code: string;
      parentOnly: boolean;
    }>,
  ): Promise<Pagination<Organisation>> {
    const maxPerPage = Math.min(filters.maxPerPage ?? this.env.MaxPerPage, 100);
    const pageNumber = Math.max(filters.currentPage ?? 1, 1);
    const skip = (pageNumber - 1) * maxPerPage;

    const where: Prisma.OrgOrganisationunitWhereInput = {
      parentid: filters.parentId,
      label: filters.label
        ? { contains: filters.label, mode: 'insensitive' }
        : undefined,
      organisationcode: filters.code
        ? { contains: filters.code, mode: 'insensitive' }
        : undefined,
      ...(filters.searchQuery && {
        OR: [
          { label: { contains: filters.searchQuery, mode: 'insensitive' } },
          {
            organisationcode: {
              contains: filters.searchQuery,
              mode: 'insensitive',
            },
          },
        ],
      }),
    };

    if (filters.parentOnly) {
      where.parentid = { not: null };
    }

    if (where.OR?.length === 0) delete where.OR;

    const [count, organisations] = await this.prisma.$transaction([
      this.prisma.orgOrganisationunit.count({ where }),
      this.prisma.orgOrganisationunit.findMany({
        include: {
          orgOrganisationunit: true,
          appApplication: true,
        },
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
      data: organisations,
    };
  }

  async getOneByCode(code: string): Promise<Organisation | null> {
    return await this.prisma.orgOrganisationunit.findFirst({
      where: {
        organisationcode: {
          contains: code,
          mode: 'insensitive',
        },
      },
    });
  }

  async getOneById(id: string): Promise<Organisation | null> {
    return await this.prisma.orgOrganisationunit.findFirst({
      where: {
        id: id,
      },
    });
  }

  async create(
    username: string,
    data: CreateOrganisationDto,
  ): Promise<Organisation | null> {
    return await this.prisma.orgOrganisationunit.create({
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
    id: string, // Cet 'id' vient du frontend
    data: UpdateOrganisationDto,
  ): Promise<OrgOrganisationunit> {
    // Étape 1 : Rechercher l'organisation par son id
    const orgUnit = await this.prisma.orgOrganisationunit.findFirst({
      where: { id: id }, // Recherche l'organisation avec id dans la table
      select: { organisationunitid: true }, // Ne récupère que organisationunitid
    });

    if (!orgUnit) {
      throw new Error('Organisation unit not found');
    }

    // Étape 2 : Utiliser organisationunitid pour la mise à jour
    return this.prisma.orgOrganisationunit.update({
      data: {
        ...data,
        updatedby: username,
      },
      where: {
        organisationunitid: orgUnit.organisationunitid, // Utilise organisationunitid pour la mise à jour
      },
    });
  }
}
