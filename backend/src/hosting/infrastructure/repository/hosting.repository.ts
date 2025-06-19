import prisma from 'src/prisma/prisma.service';
import { IHostingRepository } from './hosting.repository.interface';
import { Injectable } from '@nestjs/common';
import { Hosting } from 'src/hosting/domain/hosting.entity';
import { CreateHostingDto } from 'src/hosting/applications/dto/create-hosting.dto';
import { UpdateHostingDto } from 'src/hosting/applications/dto/update-hosting.dto';
import { MetadatasService } from 'src/metadatas/metadatas.service';
import { application } from 'express';

@Injectable()
export class HostingRepository implements IHostingRepository {
  constructor(private readonly metadataService: MetadatasService) {}

  async create(data: CreateHostingDto, ownerId: string): Promise<Hosting> {
    const { applicationId, hostingOptionId, ...rest } = data;

    return await prisma.hosting.create({
      data: {
        ...rest,
        application: { connect: { id: applicationId } },
        ...(hostingOptionId && {
          hostingOption: { connect: { id: hostingOptionId } },
        }),
        metadatas: {
          create: {
            applicationId: applicationId,
            createdById: ownerId,
            description: `Ajout de l'hébergement : ` + rest.label,
          },
        },
      },
    });
  }

  async findAll(): Promise<Hosting[]> {
    return prisma.hosting.findMany();
  }

  async findById(id: string): Promise<Hosting | null> {
    return prisma.hosting.findUnique({
      where: { id },
      include: {
        hostingOption: true,
      },
    });
  }

  async update(
    id: string,
    data: UpdateHostingDto,
    ownerId: string,
  ): Promise<Hosting> {
    const { applicationId, hostingOptionId, ...rest } = data;

    const oldHosting = await this.findById(id);

    const updatedHosting = await prisma.hosting.update({
      where: { id },
      data: {
        ...rest,
        ...(applicationId && {
          application: { connect: { id: applicationId } },
        }),
        ...(hostingOptionId && {
          hostingOption: { connect: { id: hostingOptionId } },
        }),
      },
    });

    const newHosting = await this.findById(id);

    await this.metadataService.createMetadata({
      applicationId,
      createdById: ownerId,
      title: `de l'hébergement ${oldHosting.label}`,
      entity: 'hostingId',
      entityId: id,
      fields: {
        label: 'libellé',
        'hostingOption.site': 'site',
        'hostingOption.platform': 'plateforme',
        'hostingOption.provider': 'fournisseur',
        'hostingOption.building': 'bâtiment',
        'hostingOption.room': 'pièce',
      },
      oldData: oldHosting,
      newData: newHosting,
    });

    return updatedHosting;
  }

  async delete(id: string, ownerId: string): Promise<void> {
    const hosting = await this.findById(id);

    await prisma.metadata.create({
      data: {
        action: 'delete',
        applicationId: hosting.applicationId,
        description: "Suppression de l'hébergement : " + hosting.label,
        createdById: ownerId,
      },
    });

    await prisma.hosting.delete({ where: { id } });
  }

  async findBySite(site: string): Promise<Hosting[]> {
    return prisma.hosting.findMany({
      where: {
        hostingOption: {
          site: {
            equals: site,
            mode: 'insensitive',
          },
        },
      },
      include: {
        hostingOption: true,
      },
    });
  }

  async findByApplicationId(applicationId: string): Promise<Hosting[]> {
    return prisma.hosting.findMany({
      where: { applicationId },
      include: {
        hostingOption: true,
      },
    });
  }

  async findApplicationsBySite(site: string): Promise<Hosting[]> {
    return prisma.hosting.findMany({
      where: {
        hostingOption: {
          site: {
            equals: site,
            mode: 'insensitive',
          },
        },
      },
      include: {
        application: true,
        hostingOption: true,
      },
    });
  }

  async findDistinctSites(): Promise<string[]> {
    const hostingOptionSites = await prisma.hostingOption.findMany({
      select: { site: true },
      distinct: ['site'],
      orderBy: { site: 'asc' },
    });

    return hostingOptionSites.map((r) => r.site);
  }
}
