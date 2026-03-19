import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  RelationApplicationDto,
  RelationGraphDto,
  RelationDto,
} from "./application/dto/relation-application.dto";
import { IRelationRepository } from "./infrastructure/repository/relation.repository.interface";
import { MetadatasService } from "src/metadatas/metadatas.service";

@Injectable()
export class RelationService {
  constructor(
    @Inject("IRelationRepository")
    private readonly relationRepository: IRelationRepository,
    private readonly metadataService: MetadatasService,
  ) {}

  async create(
    applicationSourceId: string,
    dto: RelationApplicationDto,
    requestorId: string,
  ): Promise<RelationDto> {
    const createdRelation = await this.relationRepository.create(
      applicationSourceId,
      dto,
    );
    await this.metadataService.createMetadata({
      applicationId: createdRelation.sourceApplication.id,
      createdById: requestorId,
      title: `de la relation avec ${createdRelation.targetApplication.label}`,
      type: "add",
    });
    await this.metadataService.createMetadata({
      applicationId: createdRelation.targetApplication.id,
      createdById: requestorId,
      title: `de la relation avec ${createdRelation.sourceApplication.label}`,
      type: "add",
    });

    return createdRelation;
  }

  async findAllForApplicationSource(
    applicationSourceId: string,
  ): Promise<RelationDto[]> {
    return this.relationRepository.findAllForApplicationSource(
      applicationSourceId,
    );
  }

  async findOne(id: string): Promise<RelationDto> {
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
  ): Promise<RelationDto> {
    const oldRelation = await this.findOne(id);
    const updated = await this.relationRepository.update(id, dto);

    await this.metadataService.createMetadata({
      applicationId: updated.sourceApplication.id,
      createdById: requestorId,
      title: `de la relation avec ${updated.targetApplication.label}`,
      fields: {
        "sourceApplication.label": "application source",
        "targetApplication.label": "application visée",
        type: "type",
      },
      newData: updated,
      oldData: oldRelation,
    });

    await this.metadataService.createMetadata({
      applicationId: updated.targetApplication.id,
      createdById: requestorId,
      title: `de la relation avec ${updated.sourceApplication.label}`,
      fields: {
        "sourceApplication.label": "application source",
        "targetApplication.label": "application visée",
        type: "type",
      },
      newData: updated,
      oldData: oldRelation,
    });

    return updated;
  }

  async delete(id: string, requestorId: string): Promise<void> {
    const deletedRelation = await this.findOne(id);

    await this.metadataService.createMetadata({
      applicationId: deletedRelation.sourceApplication.id,
      createdById: requestorId,
      title: `de la relation avec ${deletedRelation.targetApplication.label}`,
      type: "delete",
    });
    await this.metadataService.createMetadata({
      applicationId: deletedRelation.targetApplication.id,
      createdById: requestorId,
      title: `de la relation avec ${deletedRelation.sourceApplication.label}`,
      type: "delete",
    });

    return this.relationRepository.delete(id);
  }

  async getRelationGraph(
    applicationId: string,
    maxDepth: number,
  ): Promise<RelationGraphDto> {
    return this.relationRepository.getRelationGraph(applicationId, maxDepth);
  }
}
