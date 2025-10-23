import type { ApplicationService } from "src/product/application.service";
import { Injectable, NotFoundException } from "@nestjs/common";
import { MetadataService } from "src/metadata/metadata.service";
import { PrismaService } from "src/prisma/prisma.service";
import { translateEnum } from "./utils/enum.utils";

@Injectable()
export class BaseService<T> {
  constructor(
    protected readonly model: any,
    protected readonly prisma: PrismaService,
    private readonly metadataService?: MetadataService,
    private readonly applicationService?: ApplicationService,
  ) { }

  async findOne(id: string): Promise<T> {
    const object = await this.model.findUnique({ where: { id } });
    if (!object) {
      throw new NotFoundException(`${this.model.name} with ID ${id} not found`);
    }
    return object;
  }

  async countAll(): Promise<number> {
    return this.model.count();
  }

  async findAll(filters?: any): Promise<T[]> {
    return this.model.findMany({ where: filters });
  }

  async create(createDto: any): Promise<T> {
    return this.model.create({ data: createDto });
  }

  async update(id: string, data: any): Promise<T> {
    return this.model.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<T> {
    await this.findOne(id);
    return this.model.delete({ where: { id } });
  }

  async updateWithMetadata(options: {
    id: string
    data: any
    userId: string
    applicationId: string
    gender: string
    entityName: string
    metadataFields: Record<string, string>
    getName?: (entity: T) => string
    triggerQualityUpdate?: boolean
  }): Promise<T> {
    const oldEntity = await this.findOne(options.id);

    const updatedEntity = await this.update(options.id, options.data);

    if (options.triggerQualityUpdate) {
      await this.applicationService.updateApplicationQuality(
        options.applicationId,
      );
    }

    try {
      await this.metadataService.createMetadata({
        applicationId: options.applicationId,
        createdById: options.userId,
        title: `${options.gender} ${options.getName?.(updatedEntity) ?? ""}`,
        entity: options.entityName,
        entityId: options.id,
        fields: options.metadataFields,
        oldData: oldEntity,
        newData: updatedEntity,
      });
    } catch (err) {
      console.error(
        "Erreur lors de la création des métadonnées (update):",
        err,
      );
    }

    return updatedEntity;
  }

  async deleteWithMetadata(options: {
    id: string
    userId: string
    applicationId: string
    name: string
    gender?: string
    translateMap?: Record<string, string>
    triggerQualityUpdate?: boolean
  }): Promise<void> {
    const entity = await this.findOne(options.id);
    if (!entity) {
      throw new NotFoundException(`${options.id ?? "Élément"} introuvable`);
    }
    await this.model.delete({ where: { id: options.id } });

    const entityNameValue = (entity as any)[options.name] ?? "";

    const value = options.translateMap
      ? translateEnum(options.translateMap, entityNameValue)
      : entityNameValue;

    if (options.triggerQualityUpdate) {
      await this.applicationService.updateApplicationQuality(
        options.applicationId,
      );
    }

    try {
      await this.prisma.metadata.create({
        data: {
          applicationId: options.applicationId,
          createdById: options.userId,
          action: "delete",
          description: `Suppression ${options.gender} ${value}`,
        },
      });
    } catch (err) {
      console.error(
        "Erreur lors de la création des métadonnées (delete):",
        err,
      );
    }
  }
}
