import type { RelationApplicationDto, RelationGraphDto } from "../../application/dto/relation-application.dto";
import type { Relation } from "../../domain/relation.entity";

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
  getRelationGraph: (applicationId: string, maxDepth: number) => Promise<RelationGraphDto>
}
