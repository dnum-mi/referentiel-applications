import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  RelationApplicationDto,
  RelationGraphDto,
  RelationDto,
} from "./application/dto/relation-application.dto";
import { IRelationRepository } from "./infrastructure/repository/relation.repository.interface";
import { MetadatasService } from "src/metadatas/metadatas.service";
import { RelationType } from "@prisma/client";
import { normalizeCorrelationPair } from "./correlation/correlation-pair.util";

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
    // La corrélation est symétrique (#2281) : sans ordre canonique, la même
    // paire créée à la main dans l'autre sens échapperait au @@unique et
    // produirait un doublon A→B / B→A. La détection normalise déjà ses paires.
    let sourceId = applicationSourceId;
    let relationDto = dto;
    if (dto.type === RelationType.is_correlated_with) {
      const pair = normalizeCorrelationPair(
        applicationSourceId,
        dto.applicationTargetId,
      );
      sourceId = pair.applicationSourceId;
      relationDto = { ...dto, applicationTargetId: pair.applicationTargetId };
    }
    const createdRelation = await this.relationRepository.create(
      sourceId,
      relationDto,
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

  async findOne(id: string, applicationId?: string): Promise<RelationDto> {
    const relation = await this.relationRepository.findOne(id);
    if (!relation) {
      throw new NotFoundException("Relation not found");
    }
    // Scoping (#2367) : quand l'appel vient d'une route `/applications/:applicationId/relations`,
    // la relation doit impliquer cette application (comme source OU cible). Sans ce contrôle, un
    // utilisateur autorisé sur A pouvait lire/modifier/supprimer une relation entre X et Y par son
    // seul id. On répond 404 (et non 403) pour ne pas divulguer l'existence de la relation.
    if (
      applicationId &&
      relation.sourceApplication.id !== applicationId &&
      relation.targetApplication.id !== applicationId
    ) {
      throw new NotFoundException("Relation not found");
    }
    return relation;
  }

  async update(
    id: string,
    applicationId: string,
    dto: RelationApplicationDto,
    requestorId: string,
  ): Promise<RelationDto> {
    const oldRelation = await this.findOne(id, applicationId);
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

  async delete(
    id: string,
    applicationId: string,
    requestorId: string,
  ): Promise<void> {
    const deletedRelation = await this.findOne(id, applicationId);

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
