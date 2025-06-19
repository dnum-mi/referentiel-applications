// src/application/application.service.ts
import prisma from 'src/prisma/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Application } from '@prisma/client';
import {
  CreateApplicationDto,
  PatchApplicationDto,
} from './application/dto/create-application.dto';
import { ApplicationRepository } from './infrastructure/repository/application.repository';
import {
  ListApplicationDto,
  SearchApplicationDto,
} from './application/dto/search-application.dto';
import { LabelsService } from 'src/labels/labels.service';
import { MetadatasService } from 'src/metadatas/metadatas.service';

@Injectable()
export class ApplicationService {
  applications: any;
  constructor(
    private prisma: PrismaService,
    private applicationRepository: ApplicationRepository,
    private readonly labelsService: LabelsService,
    private readonly metadatasService: MetadatasService,
  ) {}

  public async createApplication(
    ownerId: string,
    createApplicationDto: CreateApplicationDto,
  ) {
    const application = await this.persistApplication(
      ownerId,
      createApplicationDto,
    );

    for (const labelDto of createApplicationDto.labels || []) {
      await this.labelsService.create({
        source: labelDto.source,
        value: labelDto.value,
        metadatas: {
          create: {
            applicationId: application.id,
            createdById: ownerId,
            description: `Ajout du libellé alternatif "${labelDto.value}" à l'application`,
          },
        },
        application: {
          connect: {
            id: application.id,
          },
        },
      });
    }
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
      const oldApp = await this.applicationRepository.findById(where.id);

      const updatedApplication = await prisma.application.update({
        where,
        data: applicationUpdates,
      });

      await this.metadatasService.createMetadata({
        applicationId: updatedApplication.id,
        createdById: ownerId,
        title: `des informations générales`,
        fields: {
          label: 'libellé',
          shortName: 'nom court',
          logo: 'logo',
          description: 'description',
          targetPopulations: 'populations cibles',
          priorityRestart: 'priorité de redémarrage',
          tags: 'tags',
          purposes: 'objectifs',
        },
        oldData: oldApp,
        newData: updatedApplication,
      });

      return updatedApplication;
    } catch {
      throw new NotFoundException(
        `Application non trouvée pour l'ID: ${where.id}`,
      );
    }
  }

  public async getSortedMetadatas(
    applicationId: string,
    offset = 0,
    limit = 1,
    order: 'asc' | 'desc' = 'asc',
  ) {
    return prisma.metadata.findMany({
      where: { applicationId },
      orderBy: { createdAt: order },
      skip: offset,
      take: limit,
      include: {
        createdBy: true,
      },
    });
  }

  public async search(dto: ListApplicationDto) {
    return this.applicationRepository.findApplicationsBySearch(dto);
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

  private async persistApplication(ownerId: string, createApplicationDto) {
    const user = await prisma.user.findUnique({
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
}
