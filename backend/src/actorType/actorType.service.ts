import { Injectable, NotFoundException } from "@nestjs/common";
import { ActorType, AppPermissions } from "@prisma/client";
import { CreateActorTypeDto, PatchActorTypeDto } from "./dto/actorType.dto";
import { AppPermsDto } from "./dto/app-perms-matrix.dto";
import { ActorTypeRepository } from "./infrastructure/repository/actorType.repository";

@Injectable()
export class ActorTypeService {
  constructor(private readonly ActorTypeRepository: ActorTypeRepository) {}

  public async create(createActorType: CreateActorTypeDto) {
    return await this.ActorTypeRepository.create(createActorType);
  }

  public async findOne(id: string) {
    const actorType = await this.ActorTypeRepository.findById(id);
    if (!actorType) {
      throw new NotFoundException(`Type d'acteur non trouvée pour l'ID ${id}`);
    }
    return actorType;
  }

  public async findAll() {
    return await this.ActorTypeRepository.findAll();
  }

  public async getPermsMatrix() {
    return this.ActorTypeRepository.getPermsMatrix();
  }

  public async updatePermsMatrix(
    matrix: AppPermsDto[],
  ): Promise<AppPermissions[]> {
    return this.ActorTypeRepository.updatePermsMatrix(
      matrix as AppPermissions[],
    );
  }

  public async update(id: string, data: PatchActorTypeDto): Promise<ActorType> {
    await this.findOne(id);
    return this.ActorTypeRepository.update({ id }, data);
  }

  public async delete(id: string) {
    await this.findOne(id);
    return this.ActorTypeRepository.delete(id);
  }
}
