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

  public async create({
    dto,
    ownerId,
  }: {
    dto: RelationApplicationDto;
    ownerId: string;
  }): Promise<Relation> {
    const createdRelation = await this.prisma.relation.create({
      data: dto,
      include: {
        sourceApplication: {
          select: { id: true },
        },
        targetApplication: {
          select: { id: true },
        },
      },
    });

    await this.metadataService.updateOldestMetadataForApplication(
      createdRelation.sourceApplication.id,
      ownerId,
    );

    await this.metadataService.updateOldestMetadataForApplication(
      createdRelation.targetApplication.id,
      ownerId,
    );

    return createdRelation;
  }

  public async findAll(): Promise<Relation[]> {
    return await this.prisma.relation.findMany();
  }

  public async findOne(id: string): Promise<Relation> {
    return await this.prisma.relation.findUnique({
      where: { id },
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
          select: { id: true },
        },
        targetApplication: {
          select: { id: true },
        },
      },
    });

    await this.metadataService.updateOldestMetadataForApplication(
      updated.sourceApplication.id,
      ownerId,
    );

    await this.metadataService.updateOldestMetadataForApplication(
      updated.targetApplication.id,
      ownerId,
    );

    return updated;
  }

  public async delete(id: string, ownerId: string): Promise<void> {
    const deletedRelation = await this.prisma.relation.findFirst({
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

    await this.metadataService.updateOldestMetadataForApplication(
      deletedRelation.sourceApplication.id,
      ownerId,
    );

    await this.metadataService.updateOldestMetadataForApplication(
      deletedRelation.targetApplication.id,
      ownerId,
    );

    await this.prisma.relation.delete({
      where: { id },
    });
  }
}
