import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IActorRepository } from './actor.repository.interface';
import { CreateActorDto, UpdateActorDto } from 'src/actor/dto/actor.dto';
import { Prisma } from '@prisma/client';
import { MetadatasService } from 'src/metadatas/metadatas.service';

@Injectable()
export class ActorRepository implements IActorRepository {
  constructor(
    private prisma: PrismaService,
    private metadataService: MetadatasService,
  ) {}

  public async create(actor: CreateActorDto, ownerId: string) {
    const { organizationId, applicationId, actorTypeId, ...rest } = actor;

    const newActor = await this.prisma.actor.create({
      data: {
        ...rest,
        ...(organizationId && {
          organization: {
            connect: { id: organizationId },
          },
        }),
        ...(applicationId && {
          application: {
            connect: { id: applicationId },
          },
        }),
        ...(actorTypeId && {
          actorType: {
            connect: { id: actorTypeId },
          },
        }),
      },
    });

    const actorDatas = await this.findById(newActor.id);

    await this.prisma.metadata.create({
      data: {
        applicationId: applicationId,
        actorId: actorDatas.id,
        createdById: ownerId,
        description: `Ajout de l'acteur ${actorDatas.actorType?.code} : ${actorDatas.email}`,
      },
    });

    return newActor;
  }

  public async findAll(applicationId?: string) {
    return await this.prisma.actor.findMany({
      where: { applicationId: applicationId },
    });
  }

  public async findById(id: string) {
    return await this.prisma.actor.findUnique({
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
    ownerId: string,
  ) {
    const { organizationId, applicationId, actorTypeId, ...rest } = actor;

    const oldActor = await this.findById(where.id);

    await this.prisma.actor.update({
      where,
      data: {
        ...rest,
        ...(organizationId && {
          organization: {
            connect: { id: organizationId },
          },
        }),
        ...(applicationId && {
          application: {
            connect: { id: applicationId },
          },
        }),
        ...(actorTypeId && {
          actorType: {
            connect: { id: actorTypeId },
          },
        }),
      },
    });

    const newActor = await this.findById(where.id);

    await this.metadataService.createMetadata({
      applicationId,
      createdById: ownerId,
      title: `de l'acteur ${oldActor.actorType?.code}`,
      entity: 'actorId',
      entityId: newActor.id,
      fields: {
        lastname: 'nom',
        firstname: 'prénom',
        email: 'email',
        'organization.sigle': 'organisation',
        'actorType.label': 'rôle',
      },
      oldData: oldActor,
      newData: newActor,
    });

    return newActor;
  }

  public async delete(id: string, ownerId: string) {
    const actor = await this.findById(id);

    await this.prisma.metadata.create({
      data: {
        applicationId: actor.applicationId,
        createdById: ownerId,
        action: 'delete',
        description: `Suppression de l'acteur ${actor.actorType.code} : ${actor.email}`,
      },
    });

    return await this.prisma.actor.delete({ where: { id } });
  }
}
