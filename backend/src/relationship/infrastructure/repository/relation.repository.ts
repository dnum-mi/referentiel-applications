import { Injectable } from "@nestjs/common";
import { Status } from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import {
  GraphEdgeDto,
  GraphNodeDto,
  RelationApplicationDto,
  RelationDto,
  RelationGraphDto,
} from "../../application/dto/relation-application.dto";
import { IRelationRepository } from "./relation.repository.interface";

@Injectable()
export class RelationRepository implements IRelationRepository {
  constructor(private readonly prisma: PrismaService) {}

  public async create(
    applicationSourceId: string,
    { applicationTargetId, type, mediationServiceId }: RelationApplicationDto,
  ): Promise<RelationDto> {
    return await this.prisma.relation.create({
      data: {
        applicationSourceId,
        applicationTargetId,
        mediationServiceId,
        type,
      },
      include: {
        sourceApplication: {
          select: { id: true, label: true },
        },
        targetApplication: {
          select: { id: true, label: true },
        },
        mediationService: {
          select: { id: true, label: true },
        },
      },
    });
  }

  public async findAllForApplicationSource(
    applicationId: string,
  ): Promise<RelationDto[]> {
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
        mediationService: {
          select: { id: true, label: true },
        },
      },
    });
  }

  public async findOne(id: string): Promise<RelationDto> {
    return await this.prisma.relation.findUnique({
      where: { id },
      include: {
        sourceApplication: {
          select: { id: true, label: true },
        },
        targetApplication: {
          select: { id: true, label: true },
        },
        mediationService: {
          select: { id: true, label: true },
        },
      },
    });
  }

  public async update(
    id: string,
    dto: RelationApplicationDto,
  ): Promise<RelationDto> {
    return await this.prisma.relation.update({
      where: { id },
      data: dto,
      include: {
        sourceApplication: {
          select: { id: true, label: true },
        },
        targetApplication: {
          select: { id: true, label: true },
        },
        mediationService: {
          select: { id: true, label: true },
        },
      },
    });
  }

  public async delete(id: string): Promise<void> {
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
            mediationService: {
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
