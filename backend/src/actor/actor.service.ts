import { Injectable, NotFoundException } from '@nestjs/common';
import { ActorRepository } from './infrastructure/repository/actor.repository';
import { CreateActorDto, UpdateActorDto } from './dto/actor.dto';
import { Prisma, Actor } from '@prisma/client';
import { ApplicationQualityService } from 'src/product/quality.service';

@Injectable()
export class ActorService {
  constructor(
    private actorRepository: ActorRepository,
    private readonly applicationQualityService: ApplicationQualityService,
  ) {}

  public async create(createActor: CreateActorDto, ownerId: string) {
    const createdActor = await this.actorRepository.create(
      createActor,
      ownerId,
    );
    await this.applicationQualityService.updateApplicationQuality(
      createdActor.applicationId,
    );
    return createdActor;
  }

  public async findOne(id: string) {
    const actor = await this.actorRepository.findById(id);
    if (!actor) {
      throw new NotFoundException(`Acteur non trouvé pour l'ID ${id}`);
    }
    return actor;
  }

  public async findAll(applicationId?: string) {
    return await this.actorRepository.findAll(applicationId);
  }

  public async update(params: {
    where: Prisma.ActorWhereUniqueInput;
    data: UpdateActorDto;
    ownerId: string;
  }): Promise<Actor> {
    const { where, data, ownerId } = params;

    await this.findOne(where.id);
    const updatedActor = await this.actorRepository.update(
      where,
      data,
      ownerId,
    );
    await this.applicationQualityService.updateApplicationQuality(
      updatedActor.applicationId,
    );
    return updatedActor;
  }

  public async delete(id: string, ownerId: string) {
    const actor = await this.findOne(id);
    const deletedActor = await this.actorRepository.delete(id, ownerId);
    await this.applicationQualityService.updateApplicationQuality(
      actor.applicationId,
    );
    return deletedActor;
  }
}
