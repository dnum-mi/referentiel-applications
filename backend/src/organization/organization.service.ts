import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Organization } from '@prisma/client';
import { OrganizationRepository } from './infrastructure/repository/organization.repository';
import {
  CreateOrganizationDto,
  PatchOrganizationDto,
} from './dto/organization.dto';

@Injectable()
export class OrganizationService {
  constructor(private OrganisationRepository: OrganizationRepository) {}

  /**
   * Crée une nouvelle Organisation
   *
   * @param CreateOrganizationDto Les données nécessaires à la création de l'organisation
   *
   * @returns L'organisation nouvellement créée
   * @throws A DÉTERMINER
   */
  public async createOrganization(createOrganization: CreateOrganizationDto) {
    return await this.OrganisationRepository.create(createOrganization);
  }

  /**
   * Met à jour une organisation existante
   *
   * @param params Contient l'ID de l'organisation et les données à mettre à jour
   *
   * @returns L'organisation mise à jour
   * @throws NotFoundException Si l'organisation à mettre à jour n'est pas trouvée
   */
  public async updateOrganization(params: {
    where: Prisma.OrganizationWhereUniqueInput;
    data: PatchOrganizationDto;
  }): Promise<Organization> {
    const { where, data } = params;

    try {
      return await this.OrganisationRepository.update(where, data);
    } catch {
      throw new NotFoundException(
        `Organisation non trouvée pour l'ID ${where.id}`,
      );
    }
  }

  /**
   * Récupère une application spécifique par son ID
   *
   * @param id L'identifiant de l'organisation à récuperer
   *
   * @returns L'organisation trouvée
   * @throws NotFoundException Si l'organisation n'est pas trouvée
   */
  public async getOrganizationById(id: string) {
    const organization = this.OrganisationRepository.findById(id);

    if (!organization) {
      throw new NotFoundException(`Organisation non trouvée pour l'ID ${id}`);
    }

    return organization;
  }

  /**
   * Récupère toutes les organisations
   *
   * @returns La liste de toutes les organisations
   * @throws Error Si une erreur survient pendant la récupération des organisations
   */
  public async getOrganizations() {
    return await this.OrganisationRepository.findAll();
  }

  /**
   * Supprime une organisation
   *
   * @param id L'identifiant de l'organisation à supprimer
   *
   * @returns L'organisation supprimée
   * @throws NotFoundException Si l'organisation à supprimer n'est pas trouvée
   */
  public async deleteOrganization(id: string) {
    const organization = await this.OrganisationRepository.delete(id);

    if (!organization) {
      throw new NotFoundException(`Organisation non trouvée pour l'ID ${id}`);
    }

    return organization;
  }
}
