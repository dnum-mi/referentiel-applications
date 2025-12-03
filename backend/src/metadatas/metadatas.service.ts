import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import isEqual from "lodash/isEqual";
import { BaseService } from "src/common/base.service";
import { PrismaService } from "src/prisma/prisma.service";
import { MetadataTypes } from "../utils/constants.util";
import { MetadataFiltersDto, MetadataPaginatedResponseDto } from "./dto/metadata.dto";
import { MetadataRepository } from "./infrastructure/metadata.repository";

@Injectable()
export class MetadatasService extends BaseService<any> {
  constructor(
    protected readonly prisma: PrismaService,
    private readonly metadataRepository: MetadataRepository,
  ) {
    super(prisma.metadata, prisma);
  }

  find(filters?: MetadataFiltersDto & { applicationId?: string }): Promise<MetadataPaginatedResponseDto> {
    return this.metadataRepository.findAll(filters);
  }

  getFirstAndLastMetadata(
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
    type?: keyof typeof MetadataTypes
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
      type = "update",
      oldData,
      newData,
    } = options;

    const extractValue = (obj: any, path: string): any => {
      return path.split(".").reduce((acc, key) => acc?.[key], obj) ?? "";
    };

    const formattingValue = (value: any): any => {
      if (value == null) {
        return value;
      }

      if (value instanceof Date) {
        return value.toISOString();
      }

      if (Array.isArray(value)) {
        return value.map(item => formattingValue(item));
      }

      if (typeof value === "object") {
        return Object.keys(value).reduce((acc, key) => {
          acc[key] = formattingValue(value[key]);
          return acc;
        }, {} as Record<string, any>);
      }

      return value;
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

    const descriptionLines = [`${MetadataTypes[type].label} ${title}`];

    let prismaData: Prisma.MetadataUncheckedCreateInput;

    if (type === "add" || type === "delete") {
      if (Object.keys(newValues).length > 0 && type === "add") {
        descriptionLines.push(`Nouvelle(s) valeur(s) : ${JSON.stringify(formattingValue(newValues))}`);
      } else if (type === "delete") {
        descriptionLines.push(`Valeur(s) supprimée(s) : ${JSON.stringify(formattingValue(oldValues))}`);
      }

      prismaData = {
        applicationId,
        createdById,
        action: MetadataTypes[type].dbAction,
        description: descriptionLines.join("\n"),
      };
    } else {
      for (const key in newValues) {
        if (!isEqual(oldValues[key], newValues[key])) {
          changedOldValues[key] = oldValues[key];
          changedNewValues[key] = newValues[key];
        }
      }

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

      prismaData = {
        applicationId,
        createdById,
        action: MetadataTypes[type].dbAction,
        description: descriptionLines.join("\n"),
      };

      if (entity && entityId) {
        prismaData[entity] = entityId;
      }
    }

    return this.prisma.metadata.create({ data: prismaData });
  }
}
