import type {
  RelationApplicationDto,
  RelationDto,
  RelationGraphDto,
} from "../../application/dto/relation-application.dto";

export interface IRelationRepository {
  create: (
    applicationSourceId: string,
    { applicationTargetId, type, mediationServiceId }: RelationApplicationDto,
  ) => Promise<RelationDto>;
  findAllForApplicationSource: (
    applicationSourceId: string,
  ) => Promise<RelationDto[]>;
  findOne: (id: string) => Promise<RelationDto>;
  update: (id: string, dto: RelationApplicationDto) => Promise<RelationDto>;
  delete: (id: string) => Promise<void>;
  getRelationGraph: (
    applicationId: string,
    maxDepth: number,
  ) => Promise<RelationGraphDto>;
}
