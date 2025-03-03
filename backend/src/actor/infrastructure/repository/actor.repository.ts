import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IActorRepository } from './actor.repository.interface';
import { CreateActorDto, UpdateActorDto } from 'src/actor/dto/actor.dto';
import { actorMap } from 'src/actor/map/actor.map';
import { Prisma } from '@prisma/client';

@Injectable()
export class ActorRepository implements IActorRepository {
  constructor(private prisma: PrismaService) {}

  public async create(actor: CreateActorDto) {
    const mappedData = actorMap(actor);
    return await this.prisma.actor.create(mappedData);
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
      },
    });
  }

  public async update(
    where: Prisma.ActorWhereUniqueInput,
    data: UpdateActorDto,
  ) {
    return await this.prisma.actor.update({ where, data });
  }

  public async delete(id: string) {
    return await this.prisma.actor.delete({ where: { id } });
  }
}
