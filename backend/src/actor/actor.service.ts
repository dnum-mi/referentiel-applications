import { Injectable, NotFoundException } from '@nestjs/common';
import { ActorRepository } from './infrastructure/repository/actor.repository';
import { CreateActorDto, UpdateActorDto } from './dto/actor.dto';
import { Prisma, Actor } from '@prisma/client';

@Injectable()
export class ActorService {
  constructor(private ActorRepository: ActorRepository) {}

  public async create(createActor: CreateActorDto) {
    return await this.ActorRepository.create(createActor);
  }

  public async findOne(id: string) {
    const actor = await this.ActorRepository.findById(id);
    if (!actor) {
      throw new NotFoundException(`Acteur non trouvé pour l'ID ${id}`);
    }
    return actor;
  }

  public async findAll() {
    return await this.ActorRepository.findAll();
  }

  public async update(params: {
    where: Prisma.ActorWhereUniqueInput;
    data: UpdateActorDto;
  }): Promise<Actor> {
    const { where, data } = params;

    await this.findOne(where.id);
    return await this.ActorRepository.update(where, data);
  }

  public async delete(id: string) {
    await this.findOne(id);
    return await this.ActorRepository.delete(id);
  }
}
