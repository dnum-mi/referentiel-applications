import { Relation } from '../../domain/relation.entity';
import { RelationApplicationDto } from '../../application/dto/relation-application.dto';
import { RelationType } from '@prisma/client';

export interface IRelationRepository {
  create({ dto }: { dto: RelationApplicationDto }): Promise<Relation>;
  findAll(): Promise<Relation[]>;
  findOne(id: string): Promise<Relation>;
  update(id: string, dto: RelationApplicationDto): Promise<Relation>;
  delete(id: string): Promise<void>;
}
