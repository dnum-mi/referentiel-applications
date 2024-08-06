import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { Application } from './entities/application.entity';
import { Pagination } from '../global-dto/pagination.dto';
import { ApplicationRolesService } from '../application-roles/application-roles.service';
import { InstancesService } from '../instances/instances.service';
import { CompliancesService } from '../compliances/compliances.service';
import { EnvironmentVariablesService } from '../environment-variables/environment-variables.service';
import map from 'lodash/map';

@Injectable()
export class ApplicationsService {
  constructor(
    private prisma: PrismaService,
    private rolesService: ApplicationRolesService,
    private instancesService: InstancesService,
    private compliancesService: CompliancesService,
    private readonly env: EnvironmentVariablesService,
  ) {}

  async getAllBy(
    filters: Partial<{
      searchQuery?: string;
      currentPage: number;
      maxPerPage: number;
      // orderBy: Prisma.AppApplicationOrderByWithRelationAndSearchRelevanceInput;
      id: string;
      parentId: string;
      nom: string;
      statut: string;
      sensibilite: string;
      parentOnly?: boolean;
    }>,
  ): Promise<Pagination<Application>> {
    const maxPerPage = Math.min(filters.maxPerPage ?? this.env.MaxPerPage, 100);
    const pageNumber = Math.max(filters.currentPage ?? 1, 1);
    const skip = (pageNumber - 1) * maxPerPage;

    const where: Prisma.AppApplicationWhereInput = {
      OR: [
        filters.id ? { id: filters.id } : undefined,
        filters.parentId ? { parentid: filters.parentId } : undefined,
        filters.nom
          ? {
              OR: [
                { longname: { contains: filters.nom, mode: 'insensitive' } },
                {
                  orgOrganisationunit: {
                    label: { contains: filters.nom, mode: 'insensitive' },
                  },
                },
              ],
            }
          : undefined,
        filters.searchQuery
          ? {
              OR: [
                {
                  longname: {
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
        filters.statut ? { status: filters.statut } : undefined,
        filters.sensibilite ? { sensitivity: filters.sensibilite } : undefined,
      ].filter(Boolean) as Prisma.AppApplicationWhereInput[], // Remove undefined values
    };

    if (filters.parentOnly) {
      where.parentid = { not: null };
    }

    if (where.OR?.length === 0) delete where.OR;

    const [count, applications] = await this.prisma.$transaction([
      this.prisma.appApplication.count({ where }),
      this.prisma.appApplication.findMany({
        include: {
          refSensitivity: true,
          fctUrbanzoneapplication: true,
          appCompliance: true,
          appApplicationid: true,
          prjApplicationrole: {
            include: {
              orgRoletype: true,
            },
          },
          appInstance: {
            include: {
              appInstancestatus: true,
            },
          },
          appStatus: true,
          orgOrganisationunit: true,
          appApplication: true,
        },
        skip,
        take: maxPerPage,
        // orderBy: filters.orderBy,
        where,
      }),
    ]);

    const totalPages = Math.ceil(count / maxPerPage);

    return {
      maxPerPage,
      currentPage: pageNumber,
      totalCount: count,
      totalPages,
      data: applications,
    };
  }

  async getOneById(appId: string): Promise<Application | null> {
    return await this.prisma.appApplication.findFirst({
      include: {
        fctUrbanzoneapplication: true,
        refSensitivity: true,
        appCompliance: true,
        appApplicationid: true,
        prjApplicationrole: {
          include: {
            orgRoletype: true,
          },
        },
        appInstance: {
          include: {
            appInstancestatus: true,
          },
        },
        appStatus: true,
        orgOrganisationunit: true,
        appApplication: true,
      },
      where: {
        applicationid: appId,
      },
    });
  }

  async getOneByNameAndOrgnisation(
    appName: string,
    organisationCode?: string,
    organisationId?: string,
  ): Promise<Application | null> {
    return this.prisma.appApplication.findFirst({
      include: {
        appCompliance: true,
        appApplicationid: true,
        prjApplicationrole: {
          include: {
            orgRoletype: true,
          },
        },
        appInstance: {
          include: {
            appInstancestatus: true,
          },
        },
      },
      where: {
        longname: {
          equals: appName,
          mode: 'insensitive',
        },
        OR: [
          { organisationunitid: organisationId },
          {
            orgOrganisationunit: {
              organisationcode: organisationCode,
            },
          },
        ],
      },
    });
  }

  async updateOrCreate(
    username: string,
    inputData: CreateApplicationDto | UpdateApplicationDto,
    isCreating: boolean,
    application?: Application | string | null,
  ): Promise<Application | string> {
    //Updating
    if (typeof application === 'string') {
      application = await this.getOneById(application);
    }

    let parent = null;

    if (inputData.parent) {
      parent = await this.prisma.appApplication.findFirst({
        where: {
          applicationid: inputData.parent,
        },
      });

      if (!parent) {
        return `L'application parent avec l'ID: ${inputData.parent} n'existe pas`;
      }
    }

    const appType = await this.prisma.appType.findFirst({
      where: {
        applicationtypecode: {
          startsWith: inputData.typeApplication ?? parent?.apptype ?? 'SVBUS',
          mode: 'insensitive',
        },
      },
    });

    if (!appType) {
      return `AppType ${inputData.typeApplication} n'existe pas`;
    }

    const orginisation = await this.prisma.orgOrganisationunit.findFirst({
      where: {
        OR: [
          { organisationunitid: inputData.organisationid },
          {
            organisationcode: {
              startsWith: inputData.organisation,
              mode: 'insensitive',
            },
          },
        ],
      },
    });

    if (!orginisation) {
      return `Le code de l'organisation ${inputData.organisation} n'existe pas`;
    }

    const sensitivity = await this.prisma.refSensitivity.findFirst({
      where: {
        sensitivitycode: inputData.sensibilite,
      },
    });

    if (!sensitivity) {
      return `Sensibilite ${inputData.sensibilite} n'existe pas`;
    }

    const status = await this.prisma.appStatus.findFirst({
      where: {
        applicationstatuscode: inputData.statut,
      },
    });

    if (!status) {
      return `Le statut ${inputData.statut} n'existe pas`;
    }

    const input = {
      updatedby: username,
      longname: inputData.longname ?? application?.longname ?? '',
      description: inputData.description ?? application?.description,
      appApplication: {
        connect: inputData.parent
          ? {
              applicationid: inputData.parent ?? application?.parentid,
            }
          : undefined,
      },
      appType: {
        connect: {
          applicationtypecode:
            appType.applicationtypecode ?? application?.apptype,
        },
      },
      orgOrganisationunit: {
        connect: {
          organisationunitid:
            orginisation.organisationunitid ?? application?.organisationunitid,
        },
      },
      refSensitivity: {
        connect: {
          sensitivitycode:
            sensitivity.sensitivitycode ?? application?.sensitivity,
        },
      },
      appStatus: {
        connect: {
          applicationstatuscode:
            status.applicationstatuscode ?? application?.status,
        },
      },
    };

    application = await this.prisma.appApplication.upsert({
      where: {
        applicationid:
          //Prisma limitation , we have to provide a unique key
          application?.applicationid ?? '00000000-0000-0000-0000-000000000000',
      },
      create: {
        ...input,
        ...{
          createdby: username,
        },
      },
      update: input,
    });

    for (const role of inputData.acteurRoles ?? []) {
      const res = await this.rolesService.updateOrCreateApplicationRoleByAppId(
        username,
        application.applicationid,
        {
          email: role.acteur.email,
          role: role.role,
        },
        role.organisation?.organisationcode,
      );
      //excpetion thrown
      if (typeof res === 'string') return res;
    }

    for (const instance of inputData.instances ?? []) {
      const instanceRes = await this.instancesService.create(
        username,
        application.applicationid,
        application.organisationunitid,
        instance,
      );
      //excpetion thrown
      if (typeof instanceRes === 'string') return instanceRes;
    }

    for (const compliance of inputData.conformite ?? []) {
      await this.compliancesService.updateOrCreateCompliancesServiceByAppId(
        username,
        application.applicationid,
        compliance,
      );
    }

    //TODO: Refactor
    if (inputData.codeApplication) {
      for (const typeCode of inputData.codeApplication) {
        //FIXME: is it should be this way?

        await this.prisma.$transaction([
          this.prisma.appIdtype.upsert({
            where: {
              applicationidtypecode: typeCode.typeCode,
            },
            create: {
              applicationidtypecode: typeCode.typeCode,
              label: '',
            },
            update: {},
          }),
          this.prisma.appApplicationid.upsert({
            where: {
              shortcode_applicationidtypecode_applicationid: {
                applicationid: application.applicationid,
                applicationidtypecode: typeCode.typeCode,
                shortcode: typeCode.codeCourt,
              },
            },
            create: {
              createdby: username,
              updatedby: username,
              applicationid: application.applicationid,
              applicationidtypecode: typeCode.typeCode,
              shortcode: typeCode.codeCourt,
              longcode: typeCode.longcode,
              comments: typeCode.comments,
            },
            update: {
              updatedby: username,
              applicationid: application.applicationid,
              applicationidtypecode: typeCode.typeCode,
              shortcode: typeCode.codeCourt,
              longcode: typeCode.longcode,
              comments: typeCode.comments,
            },
          }),
        ]);
      }

      await this.prisma.appApplicationid.deleteMany({
        where: {
          NOT: {
            applicationidtypecode: {
              in: map(inputData.codeApplication, 'typeCode'),
            },
            shortcode: {
              in: map(inputData.codeApplication, 'codeCourt'),
            },
          },
          AND: {
            applicationid: application.applicationid,
          },
        },
      });
    }

    const app = await this.prisma.appApplication.findUnique({
      include: {
        orgOrganisationunit: true,
        appApplicationid: true,
        appCompliance: true,
        prjApplicationrole: {
          include: {
            orgRoletype: true,
          },
        },
        appInstance: {
          include: {
            appInstancestatus: true,
          },
        },
      },
      where: {
        applicationid: application.applicationid,
      },
    });

    if (inputData.sensibilite) {
      await this.propagateSensitivity(
        app!.applicationid,
        inputData.sensibilite,
      );
    }
    return app as Application;
  }

  private async propagateSensitivity(appId: string, sensitivity: string) {
    const sensitivityLevel = +sensitivity[1];

    const childern =
      (await this.prisma.appApplication.findMany({
        where: {
          parentid: appId,
        },
      })) ?? [];

    for (const child of childern) {
      const childSensitivityLevel = +child.sensitivity[1];

      if (sensitivityLevel > childSensitivityLevel) {
        await this.prisma.appApplication.update({
          where: {
            applicationid: child.applicationid,
          },
          data: {
            sensitivity: sensitivity,
          },
        });

        //recursively update children
        await this.propagateSensitivity(child.applicationid, sensitivity);
      }
    }
  }
}
