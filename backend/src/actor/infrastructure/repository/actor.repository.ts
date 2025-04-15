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

    let metadataId = existingActor?.metadata?.id;

    if (metadataId) {
      await this.prisma.metadata.update({
        where: { id: metadataId },
        data: {
          updatedById: ownerId,
          updatedAt: new Date(),
        },
      });
    } else {
      const newMetadata = await this.prisma.metadata.create({
        data: {
          createdById: ownerId,
          updatedById: ownerId,
        },
      });
      metadataId = newMetadata.id;

      data.metadata = {
        connect: { id: metadataId },
      };
    }

    return await this.prisma.actor.update({ where, data });
  }

  public async delete(id: string) {
    return await this.prisma.actor.delete({ where: { id } });
  }
}
