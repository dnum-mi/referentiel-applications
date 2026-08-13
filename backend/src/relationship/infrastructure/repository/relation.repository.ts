import { Injectable } from "@nestjs/common";
import { Status } from "@prisma/client";
import { isDeleted } from "src/applications/constants/status-groups";
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

      // Le graphe n'exclut que les supprimées : les décommissionnées restent
      // visibles (écart avec RETIRED_STATUSES relevé par l'audit dédup — à
      // arbitrer métier avant tout changement, cf. #2250).
      if (isDeleted(app.currentStatus?.status)) {
        return;
      }

      this.upsertNode(nodesMap, app.id, app.label, app.currentStatus?.status);

      const relations = await this.findRelationsForApp(currentAppId);

      for (const rel of relations) {
        const nextAppId = this.processRelation(
          rel,
          currentAppId,
          nodesMap,
          edgesMap,
        );
        if (nextAppId !== null) {
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

  private findRelationsForApp(currentAppId: string) {
    return this.prisma.relation.findMany({
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
  }

  private upsertNode(
    nodesMap: Map<string, GraphNodeDto>,
    id: string,
    label: string,
    status: Status | undefined,
  ): void {
    if (!nodesMap.has(id)) {
      nodesMap.set(id, { id, label, status });
    }
  }

  /**
   * Met à jour les nœuds et l'arête d'une relation, puis renvoie l'identifiant
   * de l'application voisine à explorer (ou null si la relation est ignorée).
   */
  private processRelation(
    rel: Awaited<ReturnType<RelationRepository["findRelationsForApp"]>>[number],
    currentAppId: string,
    nodesMap: Map<string, GraphNodeDto>,
    edgesMap: Map<string, GraphEdgeDto>,
  ): string | null {
    if (
      isDeleted(rel.sourceApplication.currentStatus?.status) ||
      isDeleted(rel.targetApplication.currentStatus?.status)
    ) {
      return null;
    }

    this.upsertNode(
      nodesMap,
      rel.applicationSourceId,
      rel.sourceApplication.label,
      rel.sourceApplication.currentStatus?.status,
    );
    this.upsertNode(
      nodesMap,
      rel.applicationTargetId,
      rel.targetApplication.label,
      rel.targetApplication.currentStatus?.status,
    );

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

    return rel.applicationSourceId === currentAppId
      ? rel.applicationTargetId
      : rel.applicationSourceId;
  }
}
