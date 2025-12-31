import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { CreateActorDto, UpdateActorDto } from "src/actor/dto/actor.dto";
import { MetadatasService } from "src/metadatas/metadatas.service";
import { PrismaService } from "src/prisma/prisma.service";
import { IActorRepository } from "./actor.repository.interface";

@Injectable()
export class ActorRepository implements IActorRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metadataService: MetadatasService,
  ) {}

  public async create(actor: CreateActorDto, requestorId: string) {
    const { organizationId, applicationId, actorTypeId, ...rest } = actor;

    const newActor = await this.prisma.actor.create({
      data: {
        ...rest,
        organizationId: organizationId ?? null,
        applicationId: applicationId ?? null,
        actorTypeId,
      },
    });

    const actorDatas = await this.findById(newActor.id);

    await this.prisma.metadata.create({
      data: {
        applicationId,
        actorId: actorDatas.id,
        createdById: requestorId,
        description: `Ajout de l'acteur ${actorDatas.actorType?.code} : ${actorDatas.email}`,
      },
    });

    return newActor;
  }

  public async count(): Promise<number> {
    return this.prisma.actor.count();
  }

  public async findAll(applicationId?: string) {
    return this.prisma.actor.findMany({
      where: { applicationId },
    });
  }

  public async findById(id: string) {
    return this.prisma.actor.findUnique({
      where: { id },
      include: {
        organization: true,
        application: true,
        actorType: true,
      },
    });
  }

  public async update(
    where: Prisma.ActorWhereUniqueInput,
    actor: UpdateActorDto,
    requestorId: string,
  ) {
    const { organizationId, applicationId, actorTypeId, ...rest } = actor;

    const oldActor = await this.findById(where.id);

    await this.prisma.actor.update({
      where,
      data: {
        ...rest,
        ...(organizationId !== undefined && {
          organizationId: organizationId || null,
        }),
        ...(applicationId !== undefined && {
          applicationId: applicationId || null,
        }),
        ...(actorTypeId !== undefined && { actorTypeId }),
      },
    });

    const newActor = await this.findById(where.id);

    await this.metadataService.createMetadata({
      applicationId,
      createdById: requestorId,
      title: `de l'acteur ${oldActor.actorType?.code}`,
      entity: "actorId",
      entityId: newActor.id,
      fields: {
        lastname: "nom",
        firstname: "prénom",
        email: "email",
        "organization.sigle": "organisation",
        "actorType.label": "rôle",
      },
      oldData: oldActor,
      newData: newActor,
    });

    return newActor;
  }

  public async delete(id: string, requestorId: string) {
    const actor = await this.findById(id);

    await this.prisma.metadata.create({
      data: {
        applicationId: actor.applicationId,
        createdById: requestorId,
        action: "delete",
        description: `Suppression de l'acteur ${actor.actorType.code} : ${actor.email}`,
      },
    });

    return this.prisma.actor.delete({ where: { id } });
  }
}
