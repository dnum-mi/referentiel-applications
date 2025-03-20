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

@Injectable()
export class ApplicationService {
  applications: any;
  constructor(
    private prisma: PrismaService,
    private applicationRepository: ApplicationRepository,
  ) {}

  /**
   * Crée une nouvelle application.
   *
   * @param ownerId L'identifiant du propriétaire de l'application.
   * @param createApplicationDto Les données nécessaires à la création de l'application.
   *
   * @returns L'application nouvellement créée.
   * @throws BadRequestException Si un utilisateur référencé dans les acteurs n'existe pas.
   */
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

    return application;
  }

  /**
   * Met à jour une application existante.
   *
   * @param params Contient l'ID de l'application et les données à mettre à jour.
   *
   * @returns L'application mise à jour.
   * @throws NotFoundException Si l'application à mettre à jour n'est pas trouvée.
   */
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

        return app;
      });

      return updatedApplication;
    } catch {
      throw new NotFoundException(
        `Application non trouvée pour l'ID: ${where.id}`,
      );
    }
  }

  /**
   * Recherche des applications selon les critères fournis.
   *
   * @param searchParams Les paramètres de recherche.
   *
   * @returns La liste des applications qui correspondent aux critères de recherche.
   * @throws Error Si une erreur survient pendant la recherche.
   */
  public async searchApplications(searchParams: SearchApplicationDto) {
    const { link, label, tag, page = 1, limit = 12 } = searchParams;
    const skip = (page - 1) * limit;
    const accentFrom = 'àáâãäåèéêëìíîïòóôõöùúûüç';
    const accentTo = 'aaaaaaeeeeiiiiooooouuuuc';
    const conditions: string[] = [];

    if (label) {
      conditions.push(`
          translate(lower(label), '${accentFrom}', '${accentTo}')
          ILIKE translate(lower('%${label}%'), '${accentFrom}', '${accentTo}')
        `);
    }

    if (tag && tag.length > 0) {
      tag.forEach((t) => {
        conditions.push(`
            EXISTS (
              SELECT 1 FROM unnest(tags) AS t
              WHERE translate(lower(t), '${accentFrom}', '${accentTo}')
                    ILIKE translate(lower('%${t}%'), '${accentFrom}', '${accentTo}')
            )
          `);
      });
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const query = Prisma.raw(`
        SELECT *
        FROM public.applications
        ${whereClause}
        LIMIT ${limit} OFFSET ${skip}
      `);

    let applications = [];

    if (link) {
      const applicationsExternalRessource =
        await this.prisma.externalRessource.findMany({
          where: { link },
          include: {
            application: true,
          },
        });

      applicationsExternalRessource.forEach((externalRessource) => {
        applications.push(externalRessource.application);
      });
    } else {
      applications = await this.prisma.$queryRaw(query);
    }

    return applications as any[];
  }

  /**
   * Récupère une application spécifique par son ID.
   *
   * @param id L'identifiant de l'application à récupérer.
   *
   * @returns L'application trouvée.
   * @throws NotFoundException Si l'application n'est pas trouvée.
   */
  public async getApplicationById(applicationId: string) {
    const application =
      await this.applicationRepository.findById(applicationId);

    console.log(
      "📌 Application récupérée depuis l'API :",
      JSON.stringify(application, null, 2),
    );

    return application;
  }

  /**
   * Récupère toutes les applications.
   *
   * @returns La liste de toutes les applications.
   * @throws Error Si une erreur survient pendant la récupération des applications.
   */
  public async getApplications() {
    const applications = await this.applicationRepository.findAll();
    return applications;
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
    if (data.label !== undefined) {
      applicationUpdates.label = data.label;
    }
    if (data.shortName !== undefined) {
      applicationUpdates.shortName = data.shortName;
    }
    if (data.description !== undefined) {
      applicationUpdates.description = data.description;
    }
    if (data.purposes !== undefined) {
      applicationUpdates.purposes = { set: data.purposes };
    }
    if (data.tags !== undefined) {
      applicationUpdates.tags = { set: data.tags };
    }
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
}
