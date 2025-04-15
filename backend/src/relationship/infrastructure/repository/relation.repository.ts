// infrastructure/repository/relation.repository.ts
import { IRelationRepository } from './relation.repository.interface';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RelationApplicationDto } from '../../application/dto/relation-application.dto';
import { Relation } from '../../domain/relation.entity';
@Injectable()
export class RelationRepository implements IRelationRepository {
  constructor(private readonly prisma: PrismaService) {}

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
          select: {
            id: true,
            metadata: true,
          },
        },
        targetApplication: {
          select: {
            id: true,
            metadata: true,
          },
        },
      },
    });

    if (createdRelation.sourceApplication?.metadata?.id) {
      await this.prisma.metadata.update({
        where: { id: createdRelation.sourceApplication.metadata.id },
        data: {
          updatedById: ownerId,
          updatedAt: new Date(),
        },
      });
    }

    if (createdRelation.targetApplication?.metadata?.id) {
      await this.prisma.metadata.update({
        where: { id: createdRelation.targetApplication.metadata.id },
        data: {
          updatedById: ownerId,
          updatedAt: new Date(),
        },
      });
    }

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
          select: {
            id: true,
            metadata: true,
          },
        },
        targetApplication: {
          select: {
            id: true,
            metadata: true,
          },
        },
      },
    });

    if (updated.sourceApplication?.metadata?.id) {
      await this.prisma.metadata.update({
        where: { id: updated.sourceApplication.metadata.id },
        data: {
          updatedById: ownerId,
          updatedAt: new Date(),
        },
      });
    }

    if (updated.targetApplication?.metadata?.id) {
      await this.prisma.metadata.update({
        where: { id: updated.targetApplication.metadata.id },
        data: {
          updatedById: ownerId,
          updatedAt: new Date(),
        },
      });
    }

    return updated;
  }

  public async delete(id: string): Promise<void> {
    await this.prisma.relation.delete({
      where: { id },
    });
  }
}
