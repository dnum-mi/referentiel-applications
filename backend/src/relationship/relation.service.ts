import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { RelationApplicationDto } from './application/dto/relation-application.dto';
import { IRelationRepository } from './infrastructure/repository/relation.repository.interface';
import { Relation } from './domain/relation.entity';

@Injectable()
export class RelationService {
  constructor(
    @Inject('IRelationRepository')
    private readonly relationRepository: IRelationRepository,
  ) {}

  async create(dto: RelationApplicationDto): Promise<Relation> {
    return this.relationRepository.create({ dto });
  }

  async findAll(): Promise<Relation[]> {
    return this.relationRepository.findAll();
  }

  async findOne(id: string): Promise<Relation> {
    const relation = await this.relationRepository.findOne(id);
    if (!relation) {
      throw new NotFoundException('Relation not found');
    }
    return relation;
  }

  async update(id: string, dto: RelationApplicationDto): Promise<Relation> {
    return this.relationRepository.update(id, dto);
  }

  async delete(id: string): Promise<void> {
    return this.relationRepository.delete(id);
  }
}
