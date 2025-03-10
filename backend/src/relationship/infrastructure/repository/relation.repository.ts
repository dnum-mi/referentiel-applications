import { IRelationRepository } from './relation.repository.interface';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateRelationDto } from '../../application/dto/relation-application.dto';

@Injectable()
export class RelationRepository implements IRelationRepository {
  constructor(private readonly prisma: PrismaService) {}

  public async create({
    dto,
  }: {
    dto: CreateRelationDto;
  }): Promise<CreateRelationDto> {
    return await this.prisma.relation.create({
      data: dto,
    });
  }
}
