import { Injectable } from "@nestjs/common";
import { Status } from "@prisma/client";
import { MetadatasService } from "src/metadatas/metadatas.service";
import { PrismaService } from "../../../prisma/prisma.service";
import {
  GraphEdgeDto,
  GraphNodeDto,
  RelationApplicationDto,
  RelationGraphDto,
} from "../../application/dto/relation-application.dto";
import { Relation } from "../../domain/relation.entity";
import { IRelationRepository } from "./relation.repository.interface";

@Injectable()
export class RelationRepository implements IRelationRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metadataService: MetadatasService,
  ) {}

  public async create(
    applicationSourceId: string,
    { applicationTargetId, type }: RelationApplicationDto,
    requestorId: string,
  ): Promise<Relation> {
    const createdRelation = await this.prisma.relation.create({
      data: {
        applicationSourceId,
        applicationTargetId,
        type,
      },
      include: {
        sourceApplication: {
          select: { id: true, label: true },
        },
        targetApplication: {
          select: { id: true, label: true },
        },
      },
    });

    await this.prisma.metadata.createMany({
      data: [
        {
          applicationId: createdRelation.sourceApplication.id,
          description: `Relation ajoutée avec ${createdRelation.targetApplication.label}`,
          createdById: requestorId,
        },
        {
          applicationId: createdRelation.targetApplication.id,
          description: `Relation ajoutée avec ${createdRelation.sourceApplication.label}`,
          createdById: requestorId,
        },
      ],
    });

    return createdRelation;
  }

  public async findAllForApplicationSource(
    applicationId: string,
  ): Promise<Relation[]> {
    return await this.prisma.relation.findMany({
      where: {
        OR: [
          {
            applicationSourceId: applicationId,
          },
          {
            applicationTargetId: applicationId,
          },
        ],
      },
      include: {
        sourceApplication: {
          select: { id: true, label: true },
        },
        targetApplication: {
          select: { id: true, label: true },
        },
      },
    });
  }

  public async findOne(id: string): Promise<Relation> {
    return await this.prisma.relation.findUnique({
      where: { id },
      include: {
        sourceApplication: {
          select: { id: true, label: true },
        },
        targetApplication: {
          select: { id: true, label: true },
        },
      },
    });
  }

  public async update(
    id: string,
    dto: RelationApplicationDto,
    requestorId: string,
  ): Promise<Relation> {
    const oldRelation = await this.findOne(id);
    const updated = await this.prisma.relation.update({
      where: { id },
      data: dto,
      include: {
        sourceApplication: {
          select: { id: true, label: true },
        },
        targetApplication: {
          select: { id: true, label: true },
        },
      },
    });

    await this.metadataService.createMetadata({
      applicationId: updated.sourceApplication.id,
      createdById: requestorId,
      title: `de la relation avec ${updated.targetApplication.label}`,
      fields: {
        "sourceApplication.label": "application source",
        "targetApplication.label": "application visée",
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
      },
      newData: updated,
      oldData: oldRelation,
    });

    return updated;
  }

  public async delete(id: string, requestorId: string): Promise<void> {
    const deletedRelation = await this.prisma.relation.findFirst({
      where: { id },
      include: {
        sourceApplication: {
          select: { id: true, label: true },
        },
        targetApplication: {
          select: { id: true, label: true },
        },
      },
    });

    const description = `Relation supprimée entre ${deletedRelation.sourceApplication.label} et ${deletedRelation.targetApplication.label}`;

    await this.prisma.metadata.createMany({
      data: [
        {
          applicationId: deletedRelation.sourceApplication.id,
          action: "delete",
          description,
          createdById: requestorId,
        },
        {
          applicationId: deletedRelation.targetApplication.id,
          action: "delete",
          description,
          createdById: requestorId,
        },
      ],
    });

    await this.prisma.relation.delete({
      where: { id },
    });
  }

  public async getRelationGraph(
    applicationId: string,
    maxDepth: number,
  ): Promise<RelationGraphDto> {
    const nodesMap = new Map<string, GraphNodeDto>();
    const edgesMap = new Map<string, GraphEdgeDto>();
    const visited = new Set<string>();

    const traverse = async (currentAppId: string, depth: number) => {
      if (depth >= maxDepth || visited.has(currentAppId)) {
        return;
      }
      visited.add(currentAppId);

      const app = await this.prisma.application.findUnique({
        where: { id: currentAppId },
        select: {
          id: true,
          label: true,
          currentStatus: {
            select: {
              status: true,
            },
          },
        },
      });

      if (!app) {
        return;
      }

      if (app.currentStatus?.status === Status.deleted) {
        return;
      }

      if (!nodesMap.has(app.id)) {
        nodesMap.set(app.id, {
          id: app.id,
          label: app.label,
          status: app.currentStatus?.status,
        });
      }

      if (depth < maxDepth) {
        const relations = await this.prisma.relation.findMany({
          where: {
            OR: [
              { applicationSourceId: currentAppId },
              { applicationTargetId: currentAppId },
            ],
          },
          include: {
            sourceApplication: {
              select: {
                id: true,
                label: true,
                currentStatus: {
                  select: {
                    status: true,
                  },
                },
              },
            },
            targetApplication: {
              select: {
                id: true,
                label: true,
                currentStatus: {
                  select: {
                    status: true,
                  },
                },
              },
            },
          },
        });

        for (const rel of relations) {
          if (
            rel.sourceApplication.currentStatus?.status === Status.deleted ||
            rel.targetApplication.currentStatus?.status === Status.deleted
          ) {
            continue;
          }

          if (!nodesMap.has(rel.applicationSourceId)) {
            nodesMap.set(rel.applicationSourceId, {
              id: rel.applicationSourceId,
              label: rel.sourceApplication.label,
              status: rel.sourceApplication.currentStatus?.status,
            });
          }

          if (!nodesMap.has(rel.applicationTargetId)) {
            nodesMap.set(rel.applicationTargetId, {
              id: rel.applicationTargetId,
              label: rel.targetApplication.label,
              status: rel.targetApplication.currentStatus?.status,
            });
          }

          const edgeKey = `${rel.id}`;
          if (!edgesMap.has(edgeKey)) {
            edgesMap.set(edgeKey, {
              id: rel.id,
              sourceId: rel.applicationSourceId,
              sourceLabel: rel.sourceApplication.label,
              targetId: rel.applicationTargetId,
              targetLabel: rel.targetApplication.label,
              type: rel.type,
            });
          }

          const nextAppId =
            rel.applicationSourceId === currentAppId
              ? rel.applicationTargetId
              : rel.applicationSourceId;

          await traverse(nextAppId, depth + 1);
        }
      }
    };

    await traverse(applicationId, 0);

    return {
      nodes: Array.from(nodesMap.values()),
      edges: Array.from(edgesMap.values()),
      rootId: applicationId,
    };
  }
}
