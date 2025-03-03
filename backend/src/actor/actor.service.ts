import { Injectable, NotFoundException } from '@nestjs/common';
import { ActorRepository } from './infrastructure/repository/actor.repository';
import { CreateActorDto, UpdateActorDto } from './dto/actor.dto';
import { Prisma, Actor } from '@prisma/client';

@Injectable()
export class ActorService {
  constructor(private ActorRepository: ActorRepository) {}

  /**
   * Créer un nouvel acteur
   *
   * @param CreateActorDto Les données nécessaires à la création de l'acteur
   *
   * @returns L'acteur nouvellement créée
   * @throws BadRequestException
   */
  public async create(createActor: CreateActorDto) {
    return await this.ActorRepository.create(createActor);
  }

  /**
   * Met à jour un acteur existant
   *
   * @param params Contient l'ID de l'acteur et les données à mettre à jour
   *
   * @returns L'acteur mis à jour
   * @throws NotFoundException Si l'acteur à mettre à jour n'est pas trouvée
   */
  public async update(params: {
    where: Prisma.ActorWhereUniqueInput;
    data: UpdateActorDto;
  }): Promise<Actor> {
    const { where, data } = params;

    await this.findOne(where.id);

    return await this.ActorRepository.update(where, data);
  }

  /**
   * Récupère un acteur spécifique par son ID
   *
   * @param id L'identifiant de l'acteur à récuperer
   *
   * @returns L'acteur trouvé
   * @throws NotFoundException Si l'acteur n'est pas trouvé
   */
  public async findOne(id: string) {
    const actor = await this.ActorRepository.findById(id);

    if (!actor) {
      throw new NotFoundException(`Acteur non trouvé pour l'ID ${id}`);
    }

    return actor;
  }

  /**
   * Récupère tous les acteurs
   *
   * @returns La liste de tous les acteurs
   * @throws Error Si une erreur survient pendant la récupération des acteurs
   */
  public async findAll() {
    return await this.ActorRepository.findAll();
  }

  /**
   * Supprime un acteur spécifique par son ID
   *
   * @param id L'identifiant de l'acteur à supprimer
   *
   * @returns L'acteur supprimé
   * @throws NotFoundException Si l'acteur à supprimer n'est pas trouvé
   */
  public async delete(id: string) {
    await this.findOne(id);

    return await this.ActorRepository.delete(id);
  }
}
