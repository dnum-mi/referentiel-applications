import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { CreateActorDto, UpdateActorDto } from "src/actor/dto/actor.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { IActorRepository } from "./actor.repository.interface";

@Injectable()
export class ActorRepository implements IActorRepository {
  constructor(private readonly prisma: PrismaService) {}

  public async create(actor: CreateActorDto) {
    const { organizationId, applicationId, actorTypeId, ...rest } = actor;

    return await this.prisma.actor.create({
      data: {
        ...rest,
        organizationId: organizationId ?? null,
        applicationId: applicationId ?? null,
        actorTypeId,
      },
      include: {
        actorType: true,
        organization: true,
      },
    });
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

  public update(where: Prisma.ActorWhereUniqueInput, actor: UpdateActorDto) {
    const { organizationId, applicationId, actorTypeId, ...rest } = actor;

    return this.prisma.actor.update({
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
      include: {
        organization: true,
        application: true,
        actorType: true,
      },
    });
  }

  public delete(id: string) {
    return this.prisma.actor.delete({ where: { id } });
  }
}
