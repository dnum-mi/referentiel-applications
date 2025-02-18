import { Relation } from '../../domain/relation.entity';
import { CreateRelationDto } from '../../application/dto/relation-application.dto';

export interface IRelationRepository {
  create({ dto }: { dto: CreateRelationDto }): Promise<Relation>;
}
