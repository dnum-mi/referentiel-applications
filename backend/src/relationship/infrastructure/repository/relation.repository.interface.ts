import type { Relation } from "../../domain/relation.entity";
import type { RelationApplicationDto } from "../../application/dto/relation-application.dto";

export interface IRelationRepository {
  create: (
    applicationSourceId: string,
    { applicationTargetId, type }: RelationApplicationDto,
    requestorId: string,
  ) => Promise<Relation>
  findAllForApplicationSource: (applicationSourceId: string) => Promise<Relation[]>
  findOne: (id: string) => Promise<Relation>
  update: (
    id: string,
    dto: RelationApplicationDto,
    requestorId: any,
  ) => Promise<Relation>
  delete: (id: string, requestorId: string) => Promise<void>
}
