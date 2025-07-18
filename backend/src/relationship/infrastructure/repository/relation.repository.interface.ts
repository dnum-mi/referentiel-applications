import { Relation } from '../../domain/relation.entity';
import { RelationApplicationDto } from '../../application/dto/relation-application.dto';

export interface IRelationRepository {
  create(
    applicationSourceId: string,
    { applicationTargetId, type }: RelationApplicationDto,
    ownerId: string,
  ): Promise<Relation>;
  findAllForApplicationSource(applicationSourceId: string): Promise<Relation[]>;
  findOne(id: string): Promise<Relation>;
  update(
    id: string,
    dto: RelationApplicationDto,
    ownerId: any,
  ): Promise<Relation>;
  delete(id: string, ownerId: string): Promise<void>;
}
