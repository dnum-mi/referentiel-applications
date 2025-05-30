import { Relation } from '../../domain/relation.entity';
import { RelationApplicationDto } from '../../application/dto/relation-application.dto';

export interface IRelationRepository {
  create(
    { dto }: { dto: RelationApplicationDto },
    ownerId: any,
  ): Promise<Relation>;
  findAll(): Promise<Relation[]>;
  findOne(id: string): Promise<Relation>;
  update(
    id: string,
    dto: RelationApplicationDto,
    ownerId: any,
  ): Promise<Relation>;
  delete(id: string, ownerId: string): Promise<void>;
}
