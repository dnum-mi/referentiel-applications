import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { CreateRelationDto } from './application/dto/relation-application.dto';
import { Relation } from './domain/relation.entity';
import { IRelationRepository } from './infrastructure/repository/relation.repository.interface';

@Injectable()
export class RelationService {
  constructor(
    @Inject('IRelationRepository')
    private readonly relationRepository: IRelationRepository,
  ) {}

  async create(dto: CreateRelationDto): Promise<CreateRelationDto> {
    return this.relationRepository.create({ dto });
  }
}
