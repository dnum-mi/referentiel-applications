// src/application/application.service.ts
import { PrismaService } from 'src/prisma/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Application } from '@prisma/client';
import {
  CreateApplicationDto,
  PatchApplicationDto,
  UpdateComplianceDto,
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
    const applicationMetadata = await this.createApplicationMetadata(ownerId);
    const application = await this.persistApplication(
      ownerId,
      applicationMetadata.id,
      createApplicationDto,
    );

    await this.labelsService.create({
      source:
        'https://referentiel-applications.interieur.rie.gouv.fr/applications',
      value: application.label,
      shortname: application.shortName,
      metadata: {
        connect: {
          id: applicationMetadata.id,
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
  }): Promise<Application> {
    const { where, data } = params;
    const applicationUpdates: Prisma.ApplicationUpdateInput = {};

    this.applyScalarAndSimpleRelationUpdates(data, applicationUpdates);

    if (data.compliances !== undefined) {
      await this.applyComplianceUpdates(
        where.id,
        data.compliances,
        applicationUpdates,
      );
    }

    try {
      const updatedApplication = await this.prisma.$transaction(async (tx) => {
        const app = await tx.application.update({
          where,
          data: applicationUpdates,
        });

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

  private async createApplicationMetadata(ownerId: string) {
    const applicationMetadata = await this.prisma.metadata.create({
      data: {
        createdById: ownerId,
        updatedById: ownerId,
        createdAt: new Date(),
      },
    });

    return applicationMetadata;
  }

  private async persistApplication(
    ownerId: string,
    applicationMetadataId: string,
    createApplicationDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { keycloakId: ownerId },
      select: { email: true, keycloakId: true },
    });

    if (!user) {
      throw new NotFoundException(`User not found for keycloakId=${ownerId}`);
    }

    const application = this.applicationRepository.create(
      createApplicationDto,
      applicationMetadataId,
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

  private async applyComplianceUpdates(
    applicationId: string,
    incomingComplianceDtos: UpdateComplianceDto[],
    applicationUpdates: Prisma.ApplicationUpdateInput,
  ): Promise<void> {
    const existingComplianceRecords = await this.prisma.compliance.findMany({
      where: { applicationId },
      select: { id: true },
    });

    const existingComplianceIds = existingComplianceRecords.map((c) => c.id);
    const incomingComplianceIds = this.getIncomingComplianceIds(
      incomingComplianceDtos,
    );

    const complianceIdsToDelete = this.findComplianceIdsToDelete(
      existingComplianceIds,
      incomingComplianceIds,
    );
    const compliancesToCreate = this.findCompliancesToCreate(
      incomingComplianceDtos,
    );
    const compliancesToUpdate = this.findCompliancesToUpdate(
      incomingComplianceDtos,
      existingComplianceIds,
    );

    applicationUpdates.compliances = {
      delete: complianceIdsToDelete.map((id) => ({ id })),
      update: this.buildComplianceUpdateList(compliancesToUpdate),
      create: this.buildComplianceCreateList(compliancesToCreate),
    };
  }

  private getIncomingComplianceIds(dtos: UpdateComplianceDto[]): string[] {
    return dtos.filter((dto) => dto.id).map((dto) => dto.id as string);
  }

  private findComplianceIdsToDelete(
    existingIds: string[],
    incomingIds: string[],
  ): string[] {
    return existingIds.filter((id) => !incomingIds.includes(id));
  }

  private findCompliancesToCreate(
    dtos: UpdateComplianceDto[],
  ): UpdateComplianceDto[] {
    return dtos.filter((dto) => !dto.id);
  }

  private findCompliancesToUpdate(
    dtos: UpdateComplianceDto[],
    existingIds: string[],
  ): UpdateComplianceDto[] {
    return dtos.filter((dto) => dto.id && existingIds.includes(dto.id));
  }

  private buildComplianceUpdateList(
    dtos: UpdateComplianceDto[],
  ): Prisma.ComplianceUpdateWithWhereUniqueWithoutApplicationInput[] {
    return dtos.map((dto) => ({
      where: { id: dto.id },
      data: {
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.validityStart !== undefined && {
          validityStart: dto.validityStart ? new Date(dto.validityStart) : null,
        }),
        ...(dto.validityEnd !== undefined && {
          validityEnd: dto.validityEnd ? new Date(dto.validityEnd) : null,
        }),
        ...(dto.scoreValue !== undefined && { scoreValue: dto.scoreValue }),
        ...(dto.scoreUnit !== undefined && { scoreUnit: dto.scoreUnit }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    }));
  }

  private buildComplianceCreateList(
    dtos: UpdateComplianceDto[],
  ): Prisma.ComplianceCreateWithoutApplicationInput[] {
    return dtos.map((dto) => ({
      type: dto.type,
      name: dto.name,
      status: dto.status,
      validityStart: dto.validityStart ? new Date(dto.validityStart) : null,
      validityEnd: dto.validityEnd ? new Date(dto.validityEnd) : null,
      scoreValue: dto.scoreValue,
      scoreUnit: dto.scoreUnit,
      notes: dto.notes,
    }));
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
