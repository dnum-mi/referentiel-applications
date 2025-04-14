import { Injectable, NotFoundException } from '@nestjs/common';
import { Organization } from '@prisma/client';
import { OrganizationRepository } from './infrastructure/repository/organization.repository';
import {
  CreateOrganizationDto,
  PatchOrganizationDto,
} from './dto/organization.dto';

@Injectable()
export class OrganizationService {
  constructor(private OrganisationRepository: OrganizationRepository) {}

  public async create(createOrganization: CreateOrganizationDto) {
    return await this.OrganisationRepository.create(createOrganization);
  }

  public async findOne(id: string) {
    const organization = this.OrganisationRepository.findById(id);
    if (!organization) {
      throw new NotFoundException(`Organisation non trouvée pour l'ID ${id}`);
    }
    return organization;
  }

  public async findAll() {
    return await this.OrganisationRepository.findAll();
  }

  public async update(id, data: PatchOrganizationDto): Promise<Organization> {
    await this.findOne(id);
    return await this.OrganisationRepository.update(id, data);
  }

  public async delete(id: string) {
    await this.findOne(id);
    return await this.OrganisationRepository.delete(id);
  }
}
