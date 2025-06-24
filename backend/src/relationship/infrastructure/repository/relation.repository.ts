// infrastructure/repository/relation.repository.ts
import { IRelationRepository } from './relation.repository.interface';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RelationApplicationDto } from '../../application/dto/relation-application.dto';
import { Relation } from '../../domain/relation.entity';
import { MetadatasService } from 'src/metadatas/metadatas.service';

@Injectable()
export class RelationRepository implements IRelationRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metadataService: MetadatasService,
  ) {}

  public async create(
    { dto }: { dto: RelationApplicationDto },
    ownerId: string,
  ): Promise<Relation> {
    const createdRelation = await this.prisma.relation.create({
      data: dto,
      include: {
        sourceApplication: {
          select: { id: true, label: true },
        },
        targetApplication: {
          select: { id: true, label: true },
        },
      },
    });

    await this.prisma.metadata.createMany({
      data: [
        {
          applicationId: createdRelation.sourceApplication.id,
          description: `Relation ajoutée avec ${createdRelation.targetApplication.label}`,
          createdById: ownerId,
        },
        {
          applicationId: createdRelation.targetApplication.id,
          description: `Relation ajoutée avec ${createdRelation.sourceApplication.label}`,
          createdById: ownerId,
        },
      ],
    });

    return createdRelation;
  }

  public async findAll(): Promise<Relation[]> {
    return await this.prisma.relation.findMany();
  }

  public async findOne(id: string): Promise<Relation> {
    return await this.prisma.relation.findUnique({
      where: { id },
      include: {
        sourceApplication: {
          select: { id: true, label: true },
        },
        targetApplication: {
          select: { id: true, label: true },
        },
      },
    });
  }

  public async update(
    id: string,
    dto: RelationApplicationDto,
    ownerId: string,
  ): Promise<Relation> {
    const oldRelation = await this.findOne(id);
    const updated = await this.prisma.relation.update({
      where: { id },
      data: dto,
      include: {
        sourceApplication: {
          select: { id: true, label: true },
        },
        targetApplication: {
          select: { id: true, label: true },
        },
      },
    });

    await this.metadataService.createMetadata({
      applicationId: updated.sourceApplication.id,
      createdById: ownerId,
      title: `de la relation avec ${updated.targetApplication.label}`,
      fields: {
        'sourceApplication.label': 'application source',
        'targetApplication.label': 'application visée',
      },
      newData: updated,
      oldData: oldRelation,
    });

    await this.metadataService.createMetadata({
      applicationId: updated.targetApplication.id,
      createdById: ownerId,
      title: `de la relation avec ${updated.sourceApplication.label}`,
      fields: {
        'sourceApplication.label': 'application source',
        'targetApplication.label': 'application visée',
      },
      newData: updated,
      oldData: oldRelation,
    });

    return updated;
  }

  public async delete(id: string, ownerId: string): Promise<void> {
    const deletedRelation = await this.prisma.relation.findFirst({
      where: { id },
      include: {
        sourceApplication: {
          select: { id: true, label: true },
        },
        targetApplication: {
          select: { id: true, label: true },
        },
      },
    });

    const description = `Relation supprimée entre ${deletedRelation.sourceApplication.label} et ${deletedRelation.targetApplication.label}`;

    await this.prisma.metadata.createMany({
      data: [
        {
          applicationId: deletedRelation.sourceApplication.id,
          action: 'delete',
          description,
          createdById: ownerId,
        },
        {
          applicationId: deletedRelation.targetApplication.id,
          action: 'delete',
          description,
          createdById: ownerId,
        },
      ],
    });

    await this.prisma.relation.delete({
      where: { id },
    });
  }
}
