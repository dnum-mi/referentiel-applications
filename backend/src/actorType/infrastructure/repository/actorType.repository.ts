import { Injectable } from '@nestjs/common';
import { IActorTypeRepository } from './actorType.repository.interface';
import prisma from 'src/prisma/prisma.service';
import {
  CreateActorTypeDto,
  PatchActorTypeDto,
} from 'src/actorType/dto/actorType.dto';
import { actorTypeMap } from 'src/actorType/map/actorType.map';
import { Prisma } from '@prisma/client';

@Injectable()
export class ActorTypeRepository implements IActorTypeRepository {
  public async create(actorType: CreateActorTypeDto) {
    const mappedData = actorTypeMap(actorType);
    return await prisma.actorType.create(mappedData);
  }

  public async findAll() {
    return await prisma.actorType.findMany({
      orderBy: {
        label: 'asc',
      },
    });
  }

  public async findById(id: string) {
    return await prisma.actorType.findUnique({ where: { id } });
  }

  public async update(
    where: Prisma.ActorTypeWhereUniqueInput,
    data: PatchActorTypeDto,
  ) {
    return await prisma.actorType.update({ where, data });
  }

  public async delete(id: string) {
    return await prisma.actorType.delete({ where: { id } });
  }
}
