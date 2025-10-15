import { Injectable, NotFoundException } from "@nestjs/common";
import { ActorRepository } from "./infrastructure/repository/actor.repository";
import { CreateActorDto, UpdateActorDto } from "./dto/actor.dto";
import { Prisma, Actor } from "@prisma/client";
import { ApplicationService } from "src/product/application.service";

@Injectable()
export class ActorService {
  constructor(
    private readonly actorRepository: ActorRepository,
    private readonly applicationService: ApplicationService,
  ) {}

  public async create(createActor: CreateActorDto, requestorId: string) {
    const createdActor = await this.actorRepository.create(
      createActor,
      requestorId,
    );
    await this.applicationService.updateApplicationQuality(
      createdActor.applicationId,
    );
    return createdActor;
  }

  public async count(): Promise<number> {
    return this.actorRepository.count();
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
    where: Prisma.ActorWhereUniqueInput
    data: UpdateActorDto
    requestorId: string
  }): Promise<Actor> {
    const { where, data, requestorId } = params;

    await this.findOne(where.id);
    const updatedActor = await this.actorRepository.update(
      where,
      data,
      requestorId,
    );
    await this.applicationService.updateApplicationQuality(
      updatedActor.applicationId,
    );
    return updatedActor;
  }

  public async delete(id: string, requestorId: string) {
    const actor = await this.findOne(id);
    const deletedActor = await this.actorRepository.delete(id, requestorId);
    await this.applicationService.updateApplicationQuality(actor.applicationId);
    return deletedActor;
  }
}
