import { PrismaService } from "src/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import isEqual from "lodash/isEqual";
import { Prisma } from "@prisma/client";
import { MetadataRepository } from "./infrastructure/metadata.repository";
import { MetadataFiltersDto } from "./dto/metadata.dto";
import { PaginatedResponseDto } from "src/common/dto";

@Injectable()
export class MetadataService {
  constructor(
    protected readonly prisma: PrismaService,
    private readonly metadataRepository: MetadataRepository,
  ) { }

  public async find(filters?: MetadataFiltersDto & { applicationId?: string }): Promise<PaginatedResponseDto<any>> {
    return this.metadataRepository.findAll(filters);
  }

  async getFirstAndLastMetadata(
    applicationId: string,
  ) {
    return this.metadataRepository.findFirstAndLastByApplicationId(applicationId);
  }

  public async createMetadata<T = any>(options: {
    applicationId: string
    createdById: string
    title: string
    entity?: string
    entityId?: string
    fields?: Record<string, string>
    oldData: T
    newData: T
  }) {
    const {
      applicationId,
      createdById,
      title,
      entity,
      entityId,
      fields = {},
      oldData,
      newData,
    } = options;

    const extractValue = (obj: any, path: string): any => {
      return path.split(".").reduce((acc, key) => acc?.[key], obj) ?? "";
    };

    const buildValueMap = (source: any) => {
      const result: Record<string, any> = {};
      for (const path in fields) {
        const label = fields[path];
        result[label] = extractValue(source, path);
      }
      return result;
    };

    const oldValues = oldData ? buildValueMap(oldData) : {};
    const newValues = newData ? buildValueMap(newData) : {};

    const changedOldValues: Record<string, any> = {};
    const changedNewValues: Record<string, any> = {};

    for (const key in newValues) {
      if (!isEqual(oldValues[key], newValues[key])) {
        changedOldValues[key] = oldValues[key];
        changedNewValues[key] = newValues[key];
      }
    }

    const descriptionLines = [`Modification ${title}`];

    if (Object.keys(changedOldValues).length === 0) {
      descriptionLines.push("Aucune modification détectée.");
    } else {
      descriptionLines.push(
        `Ancienne(s) valeur(s): ${JSON.stringify(changedOldValues)}`,
      );
      descriptionLines.push(
        `Nouvelle(s) valeur(s): ${JSON.stringify(changedNewValues)}`,
      );
    }

    const prismaData: Prisma.MetadataUncheckedCreateInput = {
      applicationId,
      createdById,
      action: "update",
      description: descriptionLines.join("\n"),
    };

    if (entity && entityId) {
      prismaData[entity] = entityId;
    }

    return this.prisma.metadata.create({ data: prismaData });
  }
}
