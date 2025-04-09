import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IActorRepository } from './actor.repository.interface';
import { CreateActorDto, UpdateActorDto } from 'src/actor/dto/actor.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ActorRepository implements IActorRepository {
  constructor(private prisma: PrismaService) {}

  public async create(actor: CreateActorDto) {
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
    };

    return await this.prisma.actor.create({ data });
  }

  public async findAll() {
    return await this.prisma.actor.findMany();
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

    return await this.prisma.actor.update({ where, data });
  }

  public async delete(id: string) {
    return await this.prisma.actor.delete({ where: { id } });
  }
}
