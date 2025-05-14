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
      metadata: {
        create: {
          applicationId: applicationId,
          createdById: ownerId,
          updatedById: ownerId,
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
    };

    const existingActor = await this.prisma.actor.findUnique({
      where,
      include: { metadata: true },
    });

    await this.prisma.metadata.update({
      where: { id: existingActor?.metadata?.id },
      data: {
        updatedById: ownerId,
        updatedAt: new Date(),
      },
    });

    return await this.prisma.actor.update({ where, data });
  }

  public async delete(id: string, ownerId: string) {
    const deletedActor = await this.prisma.$transaction(async (tx) => {
      const updatedMetadata = await tx.metadata.updateMany({
        where: { actors: { some: { id } } },
        data: {
          deletedById: ownerId,
          deletedAt: new Date(),
        },
      });

      const deletedActor = await tx.actor.delete({
        where: { id },
      });

      return deletedActor;
    });

    return deletedActor;
  }
}
