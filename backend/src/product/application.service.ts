// src/application/application.service.ts
import { PrismaService } from 'src/prisma/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Application } from '@prisma/client';
import {
  CreateApplicationDto,
  PatchApplicationDto,
} from './application/dto/create-application.dto';
import { ApplicationRepository } from './infrastructure/repository/application.repository';
import { SearchApplicationDto } from './application/dto/search-application.dto';
import { LabelsService } from 'src/labels/labels.service';

@Injectable()
export class ApplicationService {
  applications: any;
  constructor(
    private prisma: PrismaService,
    private applicationRepository: ApplicationRepository,
    private readonly labelsService: LabelsService,
  ) {}

  public async createApplication(
    ownerId: string,
    createApplicationDto: CreateApplicationDto,
  ) {
    const application = await this.persistApplication(
      ownerId,
      createApplicationDto,
    );

    await this.createApplicationMetadata(application.id, ownerId);

    for (const labelDto of createApplicationDto.labels || []) {
      const labelMetadata = await this.prisma.metadata.create({
        data: {
          applicationId: application.id,
          createdById: ownerId,
          updatedById: ownerId,
          createdAt: new Date(),
        },
      });

      await this.labelsService.create({
        source: labelDto.source,
        value: labelDto.value,
        shortname: labelDto.shortname || null,
        metadata: {
          connect: {
            id: labelMetadata.id,
          },
        },
        application: {
          connect: {
            id: application.id,
          },
        },
      });
    }

    const currentLabelMetadata = await this.prisma.metadata.create({
      data: {
        applicationId: application.id,
        createdById: ownerId,
        updatedById: ownerId,
        createdAt: new Date(),
      },
    });

    await this.labelsService.create({
      source:
        'https://referentiel-applications.interieur.rie.gouv.fr/applications',
      value: application.label,
      shortname: application.shortName,
      metadata: {
        connect: {
          id: currentLabelMetadata.id,
        },
      },
      application: {
        connect: {
          id: application.id,
        },
      },
    });
    return application;
  }

  public async update(params: {
    where: Prisma.ApplicationWhereUniqueInput;
    data: PatchApplicationDto;
    ownerId: string;
  }): Promise<Application> {
    const { where, data, ownerId } = params;
    const applicationUpdates: Prisma.ApplicationUpdateInput = {};

    this.applyScalarAndSimpleRelationUpdates(data, applicationUpdates);

    try {
      const updatedApplication = await this.prisma.$transaction(async (tx) => {
        const app = await tx.application.update({
          where,
          data: applicationUpdates,
        });

        const oldestMetadata = await tx.metadata.findFirst({
          where: { applicationId: app.id },
          orderBy: { createdAt: 'asc' },
        });

        if (oldestMetadata) {
          await tx.metadata.update({
            where: { id: oldestMetadata.id },
            data: {
              updatedById: ownerId,
              updatedAt: new Date(),
            },
          });
        }

        if (data.label !== undefined || data.shortName !== undefined) {
          await this.ensureLabelExists(tx, app);
        }

        return app;
      });

      return updatedApplication;
    } catch {
      throw new NotFoundException(
        `Application non trouvée pour l'ID: ${where.id}`,
      );
    }
  }

  public async searchApplications(
    searchParams: SearchApplicationDto,
  ): Promise<any[]> {
    if (searchParams.link) {
      return this.applicationRepository.findByLink(searchParams.link);
    }
    return this.applicationRepository.searchApplications(searchParams);
  }

  public async exportApplications(): Promise<any[]> {
    return this.applicationRepository.exportAllApplicationsFull();
  }

  public async getApplicationById(applicationId: string) {
    const application =
      await this.applicationRepository.findById(applicationId);

    if (!application) {
      throw new NotFoundException(
        `Application non trouvée pour l'ID: ${applicationId}`,
      );
    }

    console.log(
      "📌 Application récupérée depuis l'API :",
      JSON.stringify(application, null, 2),
    );

    return application;
  }

  public async getApplications() {
    const applications = await this.applicationRepository.findAll();
    return applications;
  }

  public async deleteApplication(id: string): Promise<void> {
    const existing = await this.applicationRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Application non trouvée pour l'ID: ${id}`);
    }

    await this.applicationRepository.delete(id);
  }

  public async getLatestMetadata(applicationId: string) {
    return this.applicationRepository.findLatestMetadata(applicationId);
  }

  private async createApplicationMetadata(
    applicationId: string,
    ownerId: string,
  ) {
    const applicationMetadata = await this.prisma.metadata.create({
      data: {
        applicationId: applicationId,
        createdById: ownerId,
        updatedById: ownerId,
        createdAt: new Date(),
      },
    });

    return applicationMetadata;
  }

  private async persistApplication(ownerId: string, createApplicationDto) {
    const user = await this.prisma.user.findUnique({
      where: { keycloakId: ownerId },
      select: { email: true, keycloakId: true },
    });

    if (!user) {
      throw new NotFoundException(`User not found for keycloakId=${ownerId}`);
    }

    const application = this.applicationRepository.create(
      createApplicationDto,
      ownerId,
    );

    return application;
  }

  private applyScalarAndSimpleRelationUpdates(
    data: PatchApplicationDto,
    applicationUpdates: Prisma.ApplicationUpdateInput,
  ): void {
    const scalarFields = [
      'label',
      'shortName',
      'description',
      'priorityRestart',
    ] as const;
    const arrayFields = ['purposes', 'targetPopulations', 'tags'] as const;

    scalarFields.forEach((field) => {
      if (data[field] !== undefined) {
        applicationUpdates[field] = data[field];
      }
    });

    arrayFields.forEach((field) => {
      if (data[field] !== undefined) {
        applicationUpdates[field] = { set: data[field] };
      }
    });
  }

  private async ensureLabelExists(
    tx: Prisma.TransactionClient,
    application: Application,
  ) {
    const labelLower = application.label.toLowerCase();
    const shortnameLower = application.shortName
      ? application.shortName.toLowerCase()
      : null;

    const existingLabel = await tx.label.findFirst({
      where: {
        AND: [
          { value: { equals: labelLower, mode: 'insensitive' } },
          { shortname: { equals: shortnameLower, mode: 'insensitive' } },
        ],
      },
    });

    if (!existingLabel) {
      await tx.label.create({
        data: {
          source:
            'https://referentiel-applications.interieur.rie.gouv.fr/applications',
          value: application.label,
          shortname: application.shortName,
          metadata: {
            create: {
              applicationId: application.id,
              createdById: application.ownerId,
              updatedById: application.ownerId,
            },
          },
          application: {
            connect: { id: application.id },
          },
        },
      });
    }
  }
}
