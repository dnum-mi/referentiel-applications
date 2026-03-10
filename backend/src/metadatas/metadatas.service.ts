import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import isEqual from "lodash/isEqual";
import { BaseService } from "src/common/base.service";
import { PrismaService } from "src/prisma/prisma.service";
import { MetadataTypes } from "../utils/constants.util";
import { MetadataDto, MetadataFiltersDto } from "./dto/metadata.dto";
import { MetadataRepository } from "./infrastructure/metadata.repository";
import { PaginatedResponseDto } from "src/common/dto/paginated-response.dto";
import { ALL_ENUM_LABELS } from "src/applications/constants/enum-label";

@Injectable()
export class MetadatasService extends BaseService<any> {
  constructor(
    protected readonly prisma: PrismaService,
    private readonly metadataRepository: MetadataRepository,
  ) {
    super(prisma.metadata, prisma);
  }

  find(
    filters?: MetadataFiltersDto & { applicationId?: string },
  ): Promise<PaginatedResponseDto<MetadataDto>> {
    return this.metadataRepository.findAll(filters);
  }

  getFirstAndLastMetadata(applicationId: string) {
    return this.metadataRepository.findFirstAndLastByApplicationId(
      applicationId,
    );
  }

  public async createMetadata<T = any>(options: {
    applicationId?: string;
    createdById: string;
    title: string;
    entity?: string;
    entityId?: string;
    fields?: Record<string, string>;
    type?: keyof typeof MetadataTypes;
    oldData?: T;
    newData?: T;
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
      if (value == null) return value;

      if (typeof value === "boolean") return value ? "Oui" : "Non";
      if (value instanceof Date) return value.toLocaleDateString("fr-FR");
      if (typeof value === "string")
        return ALL_ENUM_LABELS[value] ? ALL_ENUM_LABELS[value] : value;
      if (Array.isArray(value))
        return value.map((item) => formattingValue(item));
      if (typeof value === "object")
        return Object.keys(value).reduce(
          (acc, key) => {
            acc[key] = formattingValue(value[key]);
            return acc;
          },
          {} as Record<string, any>,
        );

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

    const descriptionLines = [`${MetadataTypes[type].label} ${title}`];

    if (type === "update") {
      const oldValues = oldData ? buildValueMap(oldData) : {};
      const newValues = newData ? buildValueMap(newData) : {};

      const changedOldValues: Record<string, any> = {};
      const changedNewValues: Record<string, any> = {};

      for (const key in newValues) {
        if (!isEqual(oldValues[key], newValues[key])) {
          changedOldValues[key] = formattingValue(oldValues[key]);
          changedNewValues[key] = formattingValue(newValues[key]);
        }
      }

      if (Object.keys(changedOldValues).length === 0) {
        return null;
      } else {
        descriptionLines.push(
          `Ancienne(s) valeur(s): ${JSON.stringify(changedOldValues)}`,
        );
        descriptionLines.push(
          `Nouvelle(s) valeur(s): ${JSON.stringify(changedNewValues)}`,
        );
      }
    }

    let prismaData: Prisma.MetadataUncheckedCreateInput = {
      applicationId,
      createdById,
      action: MetadataTypes[type].dbAction,
      description: descriptionLines.join("\n"),
    };

    if (entity && entityId) {
      prismaData[entity] = entityId;
    }
    return await this.metadataRepository.create(prismaData);
  }
}
