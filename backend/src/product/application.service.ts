// src/application/application.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, ActorType, Application } from '@prisma/client';
import { IApplicationRepository } from './infrastructure/repository/application.repository.interface';
import {
  CreateActorDto,
  CreateApplicationDto,
  PatchApplicationDto,
  UpdateActorDto,
  UpdateComplianceDto,
  UpdateExternalRessourceDto,
} from './application/dto/create-application.dto';
import { SearchApplicationDto } from './application/dto/search-application.dto';
import { ApplicationRepository } from './infrastructure/repository/application.repository';

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

    if (data.actors !== undefined) {
      await this.applyActorUpdates(where.id, data.actors, applicationUpdates);
    }

    if (data.externalRessource !== undefined) {
      await this.applyExternalRessourceUpdates(
        where.id,
        data.externalRessource,
        applicationUpdates,
      );
    }

    try {
      const updatedApplication = await this.prisma.application.update({
        where,
        data: applicationUpdates,
      });

      return updatedApplication;
    } catch (error) {
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
    const { label, tag, page = 1, limit = 12 } = searchParams;

    const whereClause: Prisma.ApplicationWhereInput = {
      ...(label !== undefined && {
        label: {
          contains: label,
          mode: 'insensitive',
        },
      }),
      ...(tag && {
        tags: {
          hasEvery: tag,
        },
      }),
    };

    const orderByClause: Prisma.Enumerable<Prisma.ApplicationOrderByWithRelationInput> =
      {
        metadata: {
          updatedAt: 'desc',
        },
      };

    const skip = (page - 1) * limit;

    try {
      const applications = await this.prisma.application.findMany({
        where: whereClause,
        orderBy: orderByClause,
        take: limit,
        skip: skip,
        include: {
          lifecycle: true,
          actors: true,
          metadata: true,
        },
      });

      return applications;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Récupère une application spécifique par son ID.
   *
   * @param id L'identifiant de l'application à récupérer.
   *
   * @returns L'application trouvée.
   * @throws NotFoundException Si l'application n'est pas trouvée.
   */
  public async getApplicationById(id: string) {
    const application = await this.prisma.application.findUnique({
      where: { id },
      include: {
        lifecycle: {
          include: { metadata: true },
        },
        actors: {
          include: {
            user: true,
            externalOrganization: true,
          },
        },
        compliances: true,
        externals: {
          include: { externalSource: true },
        },
        externalRessource: true,
        parent: true,
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

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
    const actorsToCreate = await this.prepareActorsData(
      ownerId,
      user.email,
      createApplicationDto.actors,
    );

    const application = this.applicationRepository.create(
      createApplicationDto,
      applicationMetadataId,
      ownerId,
      actorsToCreate,
    );

    return application;
  }

  private async prepareActorsData(
    ownerId: string,
    ownerEmail: string,
    actorsDto: CreateActorDto[],
  ): Promise<Prisma.ActorCreateWithoutApplicationInput[]> {
    const actorsToCreate: Prisma.ActorCreateWithoutApplicationInput[] = [
      {
        role: 'Owner',
        email: ownerEmail,
        user: {
          connect: {
            keycloakId: ownerId,
          },
        },
        actorType: ActorType.Responsable,
      },
    ];

    if (!Array.isArray(actorsDto) || actorsDto.length === 0) {
      return actorsToCreate;
    }

    for (const actorDto of actorsDto) {
      const actorToCreate: Prisma.ActorCreateWithoutApplicationInput = {
        role: actorDto.role ?? null,
        actorType: (actorDto.type as ActorType) ?? null,
        email: actorDto.email ?? null,
      };

      actorsToCreate.push(actorToCreate);
    }

    return actorsToCreate;
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
    if (data.parentId !== undefined) {
      applicationUpdates.parent = data.parentId
        ? { connect: { id: data.parentId } }
        : { disconnect: true };
    }
    if (data.lifecycle !== undefined) {
      applicationUpdates.lifecycle = {
        update: {
          ...(data.lifecycle.status !== undefined && {
            status: data.lifecycle.status,
          }),
          ...(data.lifecycle.firstProductionDate !== undefined && {
            firstProductionDate: data.lifecycle.firstProductionDate,
          }),
          ...(data.lifecycle.plannedDecommissioningDate !== undefined && {
            plannedDecommissioningDate:
              data.lifecycle.plannedDecommissioningDate,
          }),
        },
      };
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

  private async applyExternalRessourceUpdates(
    applicationId: string,
    incomingExternalRessourceDtos: UpdateExternalRessourceDto[],
    applicationUpdates: Prisma.ApplicationUpdateInput,
  ): Promise<void> {
    const existingExternalRessource =
      await this.prisma.externalRessource.findMany({
        where: { applicationId },
        select: { id: true },
      });

    const existingExternalRessourceIds = existingExternalRessource.map(
      (c) => c.id,
    );
    const incomingExternalRessourceIds = this.getIncomingExternalRessourceIds(
      incomingExternalRessourceDtos,
    );

    const externalRessourceIdsToDelete = this.findExternalRessourceIdsToDelete(
      existingExternalRessourceIds,
      incomingExternalRessourceIds,
    );
    const externalRessourcesToCreate = this.findExternalRessourcesToCreate(
      incomingExternalRessourceDtos,
    );
    const externalRessourcesToUpdate = this.findExternalRessourcesToUpdate(
      incomingExternalRessourceDtos,
      existingExternalRessourceIds,
    );

    applicationUpdates.externalRessource = {
      delete: externalRessourceIdsToDelete.map((id) => ({ id })),
      update: this.buildExternalRessourceUpdateList(externalRessourcesToUpdate),
      create: this.buildExternalRessourceCreateList(externalRessourcesToCreate),
    };
  }

  private getIncomingExternalRessourceIds(
    dtos: UpdateExternalRessourceDto[],
  ): string[] {
    return dtos.filter((dto) => dto.id).map((dto) => dto.id as string);
  }

  private findExternalRessourceIdsToDelete(
    existingIds: string[],
    incomingIds: string[],
  ): string[] {
    return existingIds.filter((id) => !incomingIds.includes(id));
  }

  private findExternalRessourcesToCreate(
    dtos: UpdateExternalRessourceDto[],
  ): UpdateExternalRessourceDto[] {
    return dtos.filter((dto) => !dto.id);
  }

  private findExternalRessourcesToUpdate(
    dtos: UpdateExternalRessourceDto[],
    existingIds: string[],
  ): UpdateExternalRessourceDto[] {
    return dtos.filter((dto) => dto.id && existingIds.includes(dto.id));
  }

  private buildExternalRessourceUpdateList(
    dtos: UpdateExternalRessourceDto[],
  ): Prisma.ExternalRessourceUpdateWithWhereUniqueWithoutApplicationInput[] {
    return dtos.map((dto) => ({
      where: { id: dto.id },
      data: {
        ...(dto.link !== undefined && { link: dto.link }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.type !== undefined && { type: dto.type }),
      },
    }));
  }

  private buildExternalRessourceCreateList(
    dtos: UpdateExternalRessourceDto[],
  ): Prisma.ExternalRessourceCreateWithoutApplicationInput[] {
    return dtos.map((dto) => ({
      link: dto.link,
      description: dto.description,
      type: dto.type,
    }));
  }

  private async applyActorUpdates(
    applicationId: string,
    incomingActorDtos: UpdateActorDto[],
    applicationUpdates: Prisma.ApplicationUpdateInput,
  ): Promise<void> {
    // Get existing actors for the application
    const existingActors = await this.prisma.actor.findMany({
      where: { applicationId },
      include: {
        externalOrganization: true,
      },
    });

    // Extract IDs for comparison
    const existingActorIds = existingActors.map((a) => a.id);
    const incomingActorIds = incomingActorDtos
      .filter((a) => a.id)
      .map((a) => a.id as string);

    // Determine actors to create, update, and delete
    const actorsToCreate = incomingActorDtos.filter((a) => !a.id);
    const actorsToUpdate = incomingActorDtos.filter(
      (a) => a.id && existingActorIds.includes(a.id),
    );
    const actorIdsToDelete = existingActorIds.filter(
      (id) => !incomingActorIds.includes(id),
    );

    // Build the update object for the application's actors
    applicationUpdates.actors = {
      // Delete actors that are no longer present
      delete: actorIdsToDelete.map((id) => ({ id })),

      // Update existing actors
      update: actorsToUpdate.map((actor) => ({
        where: { id: actor.id },
        data: {
          role: actor.role ?? null,
          email: actor.email ?? null,
          actorType: actor.actorType
            ? { set: actor.actorType as ActorType }
            : undefined,
          // ...(actor.organizationId && {
          //   externalOrganization: {
          //     connect: { id: actor.organizationId },
          //   },
          // }),
        },
      })),
      create: actorsToCreate.map((actor) => ({
        role: actor.role ?? null,
        email: actor.email ?? null,
        actorType: (actor.actorType as ActorType) ?? null,
        // ...(actor.organizationId && {
        //   externalOrganization: {
        //     connect: { id: actor.organizationId },
        //   },
        // }),
      })),
    };
  }
}
