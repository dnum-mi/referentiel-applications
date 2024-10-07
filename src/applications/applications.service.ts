import { excludes } from './../utilities/index';
import { Organisation } from './../organisations/entities/organisation.entity';
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
import _ from 'lodash';

@Injectable()
export class ApplicationsService {
  constructor(
    private prisma: PrismaService,
    private rolesService: ApplicationRolesService,
    private instancesService: InstancesService,
    private compliancesService: CompliancesService,
    private readonly env: EnvironmentVariablesService,
  ) {}

  public async getAllBy(
    filters: Partial<{
      searchQuery?: string;
      currentPage: number;
      maxPerPage: number;
      id: string;
      parentId: string;
      nom: string;
      statut: string;
      sensibilite: string;
      parentOnly?: boolean;
    }>,
  ): Promise<Pagination<Application>> {
    const maxPerPage = Math.min(
      filters.maxPerPage ?? this.env.MaxPerPage,
      10000,
    );
    const pageNumber = Math.max(filters.currentPage ?? 1, 1);
    const skip = (pageNumber - 1) * maxPerPage;
    this.buildWhereClause(filters);
    const where: Prisma.AppApplicationWhereInput = {
      ...(filters.statut && { status: filters.statut }),
      ...(filters.nom && {
        longname: { contains: filters.nom, mode: 'insensitive' },
      }),
      ...(filters.sensibilite && { sensitivity: filters.sensibilite }),
      ...(filters.parentOnly && { parentid: { not: null } }),
      ...(filters.searchQuery && {
        AND: [
          {
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
            ],
          },
        ],
      }),
    };

    const [count, applications] = await this.prisma.$transaction([
      this.prisma.appApplication.count({ where }),
      this.prisma.appApplication.findMany({
        include: this.getApplicationIncludes(),
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
      data: applications,
    };
  }

  public async getOneById(appId: string): Promise<Application | null> {
    return await this.prisma.appApplication.findFirst({
      include: this.getApplicationIncludes(),
      where: { applicationid: appId },
    });
  }

  public async getOneByNameAndOrgnisation(
    appName: string,
    organisationCode?: string,
    organisationId?: string,
  ): Promise<Application | null> {
    return this.prisma.appApplication.findFirst({
      include: this.getApplicationIncludes(),
      where: {
        longname: { equals: appName, mode: 'insensitive' },
        OR: [
          { organisationunitid: organisationId },
          { orgOrganisationunit: { organisationcode: organisationCode } },
        ],
      },
    });
  }

  public async createApplication(
    username: string,
    inputData: CreateApplicationDto,
  ): Promise<Application | string> {
    const validation = await this.validateApplicationData(inputData);
    if (typeof validation === 'string') return validation;

    return this.saveApplicationData(username, inputData, validation, null);
  }

  public async updateApplication(
    username: string,
    applicationId: string,
    inputData: UpdateApplicationDto,
  ): Promise<Application | string> {
    const application = await this.getOneById(applicationId);
    if (!application)
      return `Application with ID ${applicationId} does not exist`;

    const validation = await this.validateApplicationData(
      inputData,
      application,
    );
    if (typeof validation === 'string') return validation;

    return this.saveApplicationData(
      username,
      inputData,
      validation,
      application,
    );
  }

  private async validateApplicationData(
    inputData: CreateApplicationDto | UpdateApplicationDto,
    application?: Application,
  ) {
    const sanitizedUpdateDto = _.omit(UpdateApplicationDto, 'createdAt');

    if (inputData.parent && inputData.parent === application?.applicationid) {
      return `Une application ne peut pas être son propre parent.`;
    }

    if (inputData.parent) {
      const parent = await this.findFirstParent(inputData.parent);
      if (!parent) {
        return `L'application parent avec l'ID: ${inputData.parent} n'existe pas`;
      }
    }

    const appType = await this.findFirstAppType(inputData.typeApplication);
    if (!appType) return `AppType ${inputData.typeApplication} n'existe pas`;

    const organisation = await this.findFirstOrganisation(
      inputData.organisationid,
      inputData.organisation,
    );
    if (!organisation)
      return `Le code de l'organisation ${inputData.organisation} n'existe pas`;

    const sensitivity = await this.prisma.refSensitivity.findFirst({
      where: { sensitivitycode: inputData.sensibilite },
    });
    if (!sensitivity)
      return `Sensibilité ${inputData.sensibilite} n'existe pas`;

    const status = await this.prisma.appStatus.findFirst({
      where: { applicationstatuscode: inputData.statut },
    });
    if (!status) return `Le statut ${inputData.statut} n'existe pas`;

    return { appType, organisation, sanitizedUpdateDto, sensitivity, status };
  }

  private async saveApplicationData(
    username: string,
    inputData: CreateApplicationDto | UpdateApplicationDto,
    validationData: any,
    application: Application | null,
  ) {
    const input = {
      updatedby: username,
      longname: inputData.longname ?? application?.longname ?? '',
      description: inputData.description ?? application?.description,
      appApplication: {
        connect: inputData.parent
          ? { applicationid: inputData.parent ?? application?.parentid }
          : undefined,
      },
      appType: {
        connect: {
          applicationtypecode: validationData.appType.applicationtypecode,
        },
      },
      orgOrganisationunit: {
        connect: {
          organisationunitid:
            validationData.organisation.organisationunitid ??
            application?.organisationunitid,
        },
      },
      refSensitivity: {
        connect: {
          sensitivitycode: validationData.sensitivity.sensitivitycode,
        },
      },
      appStatus: {
        connect: {
          applicationstatuscode: validationData.status.applicationstatuscode,
        },
      },
    };

    application = await this.prisma.appApplication.upsert({
      where: {
        applicationid:
          application?.applicationid ?? '00000000-0000-0000-0000-000000000000',
      },
      create: {
        ...input,
        createdby: username,
      },
      update: input,
    });

    // Gestion des entités liées (roles, instances, conformités, etc.)
    await this.handleRelatedEntities(username, application, inputData);

    const app = await this.getOneById(application.applicationid);
    if (inputData.sensibilite) {
      await this.propagateSensitivity(
        app!.applicationid,
        inputData.sensibilite,
      );
    }

    return app as Application;
  }

  private async handleRelatedEntities(
    username: string,
    application: Application,
    inputData: CreateApplicationDto | UpdateApplicationDto,
  ) {
    await this.handleRoles(username, application, inputData.acteurRoles);
    await this.handleInstances(username, application, inputData.instances);
    await this.handleCompliances(username, application, inputData.conformite);
    await this.handleCodes(username, application, inputData.codeApplication);
  }

  private async handleRoles(
    username: string,
    application: Application,
    roles?: any[],
  ) {
    for (const role of roles ?? []) {
      const res = await this.rolesService.updateOrCreateApplicationRoleByAppId(
        username,
        application.applicationid,
        {
          email: role.acteur.email,
          role: role.role,
        },
        role.organisation?.organisationcode,
      );
      if (typeof res === 'string') throw new Error(res);
    }
  }

  private async handleInstances(
    username: string,
    application: Application,
    instances?: any[],
  ) {
    for (const instance of instances ?? []) {
      const res = await this.instancesService.create(
        username,
        application.applicationid,
        application.organisationunitid,
        instance,
      );
      if (typeof res === 'string') throw new Error(res);
    }
  }

  private async handleCompliances(
    username: string,
    application: Application,
    conformites?: any[],
  ) {
    for (const compliance of conformites ?? []) {
      await this.compliancesService.updateOrCreateCompliancesServiceByAppId(
        username,
        application.applicationid,
        compliance,
      );
    }
  }

  private async handleCodes(
    username: string,
    application: Application,
    codeApplications?: any[],
  ) {
    if (codeApplications) {
      for (const typeCode of codeApplications) {
        await this.prisma.$transaction([
          this.prisma.appIdtype.upsert({
            where: { applicationidtypecode: typeCode.typeCode },
            create: { applicationidtypecode: typeCode.typeCode, label: '' },
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
            applicationidtypecode: { in: map(codeApplications, 'typeCode') },
            shortcode: { in: map(codeApplications, 'codeCourt') },
          },
          AND: { applicationid: application.applicationid },
        },
      });
    }
  }

  private async propagateSensitivity(appId: string, sensitivity: string) {
    const sensitivityLevel = +sensitivity[1];
    const children = await this.prisma.appApplication.findMany({
      where: { parentid: appId },
    });

    for (const child of children) {
      const childSensitivityLevel = +child.sensitivity[1];
      if (sensitivityLevel > childSensitivityLevel) {
        await this.prisma.appApplication.update({
          where: { applicationid: child.applicationid },
          data: { sensitivity: sensitivity },
        });
        await this.propagateSensitivity(child.applicationid, sensitivity);
      }
    }
  }

  private async findFirstParent(parentId: string | undefined) {
    if (!parentId) {
      return null; // Retourne null si parentId est undefined ou null
    }

    return await this.prisma.appApplication.findFirst({
      where: {
        applicationid: parentId,
      },
    });
  }
  private async findFirstAppType(typeApplication = 'SVBUS'): Promise<{
    applicationtypecode: string;
    label: string;
  } | null> {
    return await this.prisma.appType.findFirst({
      where: {
        applicationtypecode: {
          startsWith: typeApplication,
          mode: 'insensitive',
        },
      },
    });
  }

  private async findFirstOrganisation(
    organisationId: string | undefined,
    organisation: string | undefined,
  ): Promise<Organisation | null> {
    return await this.prisma.orgOrganisationunit.findFirst({
      where: {
        OR: [
          { organisationunitid: organisationId },
          {
            organisationcode: {
              startsWith: organisation,
              mode: 'insensitive',
            },
          },
        ],
      },
    });
  }

  private buildWhereClause(filters: any): Prisma.AppApplicationWhereInput {
    const orConditions: Prisma.AppApplicationWhereInput[] = [];

    if (filters.id) {
      orConditions.push({ applicationid: filters.id });
    }

    if (filters.parentId) {
      orConditions.push({ parentid: filters.parentId });
    }

    if (filters.longname) {
      orConditions.push({
        OR: [
          { longname: { contains: filters.longname, mode: 'insensitive' } },
          {
            orgOrganisationunit: {
              label: { contains: filters.longname, mode: 'insensitive' },
            },
          },
        ],
      });
    }

    if (filters.searchQuery) {
      orConditions.push({
        OR: [
          { longname: { contains: filters.searchQuery, mode: 'insensitive' } },
          {
            description: { contains: filters.searchQuery, mode: 'insensitive' },
          },
          {
            orgOrganisationunit: {
              label: { contains: filters.searchQuery, mode: 'insensitive' },
            },
          },
        ],
      });
    }

    if (filters.statut) {
      orConditions.push({ status: filters.statut });
    }

    if (filters.sensibilite) {
      orConditions.push({ sensitivity: filters.sensibilite });
    }

    const where: Prisma.AppApplicationWhereInput = {};

    if (orConditions.length > 0) {
      where.OR = orConditions;
    }

    if (filters.parentOnly) {
      where.parentid = { not: null };
    }

    return where;
  }

  private getApplicationIncludes() {
    return {
      refSensitivity: true,
      fctUrbanzoneapplication: true,
      appCompliance: true,
      appApplicationid: true,
      prjApplicationrole: {
        include: { orgRoletype: true },
      },
      appInstance: {
        include: { appInstancestatus: true },
      },
      appStatus: true,
      orgOrganisationunit: true,
      appApplication: true,
    };
  }
}
