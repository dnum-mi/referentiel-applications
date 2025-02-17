import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, Organization } from '@prisma/client';
import { OrganizationRepository } from './infrastructure/repository/organization.repository';
import {
  CreateOrganizationDto,
  PatchOrganizationDto,
} from './dto/create-organization.dto';

@Injectable()
export class OrganizationService {
  organisations: any;

  constructor(
    private prisma: PrismaService,
    private OrganisationRepository: OrganizationRepository,
  ) {}

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
   * @param params Contient l'ID de l'application et les données à mettre à jour
   *
   * @returns L'organisation mise à jour
   * @throws NotFoundException Si l'application à mettre à jour n'est pas trouvée
   */
  public async updateOrganization(params: {
    where: Prisma.OrganizationWhereUniqueInput;
    data: PatchOrganizationDto;
  }): Promise<Organization> {
    const { where, data } = params;

    try {
      return await this.prisma.organization.update({
        where,
        data,
      });
    } catch (error) {
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
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
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
}
