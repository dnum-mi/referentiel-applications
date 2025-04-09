import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ActorType, Actor } from '@prisma/client';
import { ActorTypeRepository } from './infrastructure/repository/actorType.repository';
import { CreateActorTypeDto, PatchActorTypeDto } from './dto/actorType.dto';

@Injectable()
export class ActorTypeService {
  constructor(private ActorTypeRepository: ActorTypeRepository) {}

  public async create(createActorType: CreateActorTypeDto) {
    return await this.ActorTypeRepository.create(createActorType);
  }

  public async findOne(id: string) {
    const actorType = this.ActorTypeRepository.findById(id);
    if (!actorType) {
      throw new NotFoundException(`Type d'acteur non trouvée pour l'ID ${id}`);
    }
    return actorType;
  }

  public async findAll() {
    return await this.ActorTypeRepository.findAll();
  }

  public async update(id, data: PatchActorTypeDto): Promise<ActorType> {
    await this.findOne(id);
    return await this.ActorTypeRepository.update(id, data);
  }

  public async delete(id: string) {
    await this.findOne(id);
    return await this.ActorTypeRepository.delete(id);
  }
}
