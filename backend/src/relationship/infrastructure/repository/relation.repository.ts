// infrastructure/repository/relation.repository.ts
import { IRelationRepository } from './relation.repository.interface';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RelationApplicationDto } from '../../application/dto/relation-application.dto';
import { Relation } from '../../domain/relation.entity';

@Injectable()
export class RelationRepository implements IRelationRepository {
  constructor(private readonly prisma: PrismaService) {}

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

    const description = `Relation entre ${createdRelation.sourceApplication.label} et ${createdRelation.targetApplication.label} ajoutée`;

    await this.prisma.metadata.createMany({
      data: [
        {
          applicationId: createdRelation.sourceApplication.id,
          description,
          createdById: ownerId,
        },
        {
          applicationId: createdRelation.targetApplication.id,
          description,
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
          select: { id: true },
        },
        targetApplication: {
          select: { id: true },
        },
      },
    });
  }

  public async update(
    id: string,
    dto: RelationApplicationDto,
    ownerId: string,
  ): Promise<Relation> {
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

    const description = `Relation entre ${updated.sourceApplication.label} et ${updated.targetApplication.label} mise à jour`;

    await this.prisma.metadata.createMany({
      data: [
        {
          applicationId: updated.sourceApplication.id,
          action: 'update',
          description,
          createdById: ownerId,
        },
        {
          applicationId: updated.targetApplication.id,
          action: 'update',
          description,
          createdById: ownerId,
        },
      ],
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

    const description = `Relation entre ${deletedRelation.sourceApplication.label} et ${deletedRelation.targetApplication.label} supprimée`;

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
