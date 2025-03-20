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
  }: {
    dto: RelationApplicationDto;
  }): Promise<Relation> {
    return await this.prisma.relation.create({
      data: dto,
    });
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
  ): Promise<Relation> {
    return await this.prisma.relation.update({
      where: { id },
      data: dto,
    });
  }

  public async delete(id: string): Promise<void> {
    await this.prisma.relation.delete({
      where: { id },
    });
  }
}
