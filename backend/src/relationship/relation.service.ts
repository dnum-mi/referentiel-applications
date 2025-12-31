import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  RelationApplicationDto,
  RelationGraphDto,
} from "./application/dto/relation-application.dto";
import { Relation } from "./domain/relation.entity";
import { IRelationRepository } from "./infrastructure/repository/relation.repository.interface";

@Injectable()
export class RelationService {
  constructor(
    @Inject("IRelationRepository")
    private readonly relationRepository: IRelationRepository,
  ) {}

  async create(
    applicationSourceId: string,
    dto: RelationApplicationDto,
    requestorId: string,
  ): Promise<Relation> {
    return this.relationRepository.create(
      applicationSourceId,
      dto,
      requestorId,
    );
  }

  async findAllForApplicationSource(
    applicationSourceId: string,
  ): Promise<Relation[]> {
    return this.relationRepository.findAllForApplicationSource(
      applicationSourceId,
    );
  }

  async findOne(id: string): Promise<Relation> {
    const relation = await this.relationRepository.findOne(id);
    if (!relation) {
      throw new NotFoundException("Relation not found");
    }
    return relation;
  }

  async update(
    id: string,
    dto: RelationApplicationDto,
    requestorId: string,
  ): Promise<Relation> {
    return this.relationRepository.update(id, dto, requestorId);
  }

  async delete(id: string, requestorId: string): Promise<void> {
    return this.relationRepository.delete(id, requestorId);
  }

  async getRelationGraph(
    applicationId: string,
    maxDepth: number,
  ): Promise<RelationGraphDto> {
    return this.relationRepository.getRelationGraph(applicationId, maxDepth);
  }
}
