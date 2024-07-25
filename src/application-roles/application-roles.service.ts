import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Pagination } from '../global-dto/pagination.dto';
import { Prisma } from '@prisma/client';
import { ApplicationRole } from './entities/application-role.entity';
import { CreateApplicationRoleDto } from './dto/create-application-role.dto';
import moment from 'moment';
import { EnvironmentVariablesService } from '../environment-variables/environment-variables.service';
import { FilterApplicationRolesDto } from './dto/filter-application-role.dto';
import set from 'lodash/set';

@Injectable()
export class ApplicationRolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly env: EnvironmentVariablesService,
  ) {}

  async getAllBy(
    filters: {
      applicationId: string;
    } & FilterApplicationRolesDto,
  ): Promise<Pagination<ApplicationRole>> {
    const maxPerPage = Math.min(filters.maxPerPage ?? this.env.MaxPerPage, 100);
    const pageNumber = Math.max(filters.currentPage ?? 1, 1);
    const skip = (pageNumber - 1) * maxPerPage;

    const where: Prisma.PrjApplicationroleWhereInput = {
      applicationid: filters.applicationId ?? undefined,
      OR: [
        filters.searchQuery
          ? {
              OR: [
                {
                  actActor: {
                    name: {
                      contains: filters.searchQuery,
                      mode: 'insensitive',
                    },
                  },
                },
                {
                  orgOrganisationunit: {
                    label: {
                      contains: filters.searchQuery,
                      mode: 'insensitive',
                    },
                  },
                },
              ],
            }
          : undefined,
      ].filter(Boolean) as Prisma.PrjApplicationroleWhereInput[], // Remove undefined values
    };

    if (where.OR?.length === 0) delete where.OR;
    const query = {
      include: {
        actActor: true,
        orgRoletype: true,
        orgOrganisationunit: true,
      },
      skip,
      take: maxPerPage,
      orderBy: [] as any,
      where,
    };

    //generic sorting!
    for (const sort of filters.sort ?? []) {
      query.orderBy.push(set({}, sort.key, sort.order));
    }

    const [count, roles] = await this.prisma.$transaction([
      this.prisma.prjApplicationrole.count({ where }),
      this.prisma.prjApplicationrole.findMany(query),
    ]);

    const totalPages = Math.ceil(count / maxPerPage);

    return {
      maxPerPage,
      currentPage: pageNumber,
      totalCount: count,
      totalPages,
      data: roles,
    };
  }

  async updateOrCreateApplicationRoleByAppId(
    username: string,
    applicationid: string,
    inputData: CreateApplicationRoleDto,
    organisationCode?: string,
  ): Promise<ApplicationRole | string> {
    const app = await this.prisma.appApplication.findFirst({
      where: {
        applicationid,
      },
    });

    if (!app) {
      return `Application ${applicationid} not found!`;
    }

    if (inputData.role === 'owner') {
      inputData.role = 'SOUSC';
    }

    const role = await this.prisma.orgRoletype.findFirst({
      where: {
        OR: [
          {
            roleid: {
              startsWith: inputData.role.trimEnd(),
              mode: 'insensitive',
            },
          },
          {
            label: {
              startsWith: inputData.role.trimEnd(),
              mode: 'insensitive',
            },
          },
        ],
      },
    });

    if (!role) {
      return `ApplicationRole ${inputData.role} Not found!`;
    }

    let actor = await this.prisma.actActor.findFirst({
      where: {
        email: inputData.email,
      },
    });

    //TODO: currently if organisationCode is not set , we default to application orginisation
    let organisationunitid = app?.organisationunitid;
    if (organisationCode) {
      const org = await this.prisma.orgOrganisationunit.findFirst({
        where: {
          organisationcode: {
            startsWith: organisationCode,
            mode: 'insensitive',
          },
        },
      });

      if (org) {
        organisationunitid = org.organisationunitid;
      }
    }

    if (!actor) {
      actor = await this.prisma.actActor.create({
        data: {
          email: inputData.email,
          name: inputData.email.split('@')[0],
          organisationunitid,
          validationdate: moment()
            .add(this.env.ValidationDays, 'days')
            .toISOString(),
          createdby: username,
          updatedby: username,
        },
      });
    }

    return this.prisma.prjApplicationrole.upsert({
      include: {
        orgOrganisationunit: true,
      },
      where: {
        applicationid_organisationunitid: {
          applicationid: app.applicationid,
          organisationunitid,
        },
        AND: [
          {
            actorid: actor.actorid,
          },
        ],
      },
      create: {
        actorid: actor.actorid,
        applicationid: app.applicationid,
        organisationunitid,
        roleid: role.roleid,
        validationdate: moment()
          .add(this.env.RoleValidationDays, 'days')
          .toISOString(),
        createdby: username,
        updatedby: username,
      },
      update: {
        roleid: role.roleid,
        validationdate: moment()
          .add(this.env.RoleValidationDays, 'days')
          .toISOString(),
        updatedby: username,
      },
    });
  }
}
