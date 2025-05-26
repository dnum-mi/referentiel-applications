import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IActorRepository } from './actor.repository.interface';
import { CreateActorDto, UpdateActorDto } from 'src/actor/dto/actor.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ActorRepository implements IActorRepository {
  constructor(private prisma: PrismaService) {}

  public async create(actor: CreateActorDto, ownerId: string) {
    const { organizationId, applicationId, actorTypeId, ...rest } = actor;

    const data: Prisma.ActorCreateInput = {
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
      metadatas: {
        create: {
          applicationId: applicationId,
          createdById: ownerId,
          description: "Création de l'acteur " + actor.email,
        },
      },
    };

    return await this.prisma.actor.create({ data });
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

    const data: Prisma.ActorUpdateInput = {
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
      metadatas: {
        create: {
          applicationId: applicationId,
          createdById: ownerId,
          action: 'update',
          description: "Mise à jour de l'acteur " + actor.email,
        },
      },
    };

    return await this.prisma.actor.update({ where, data });
  }

  public async delete(id: string, ownerId: string) {
    return await this.prisma.$transaction(async (tx) => {
      const actor = await tx.actor.findUniqueOrThrow({
        where: { id },
        select: { applicationId: true, email: true },
      });

      await tx.metadata.create({
        data: {
          action: 'delete',
          applicationId: actor.applicationId,
          description: "Suppression de l'acteur " + actor.email,
          createdById: ownerId,
        },
      });

      return tx.actor.delete({ where: { id } });
    });
  }
}
