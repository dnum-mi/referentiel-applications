import type { ApplicationService } from "src/applications/application.service";
import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { MetadatasService } from "src/metadatas/metadatas.service";
import { PrismaService } from "src/prisma/prisma.service";
import { ServiceOptions } from "./utils/types";
import { PaginatedResponseDto, PaginationDto } from "./dto";

@Injectable()
export class BaseService<T, TDelegate = any> {
  constructor(
    protected readonly model: any,
    protected readonly prisma: PrismaService,
    private readonly metadataService?: MetadatasService,
    private readonly applicationService?: ApplicationService,
  ) {}

  async findOne(id: string, include = {}): Promise<T> {
    const object = await this.model.findUnique({ where: { id }, include });
    if (!object) {
      throw new NotFoundException(`${this.model.name} with ID ${id} not found`);
    }
    return object;
  }

  async findAll(
    filters: Prisma.Args<TDelegate, "findMany"> &
      Pick<PaginationDto, "page" | "pageSize">,
  ): Promise<PaginatedResponseDto<T>> {
    return this.model.paginate(filters);
  }

  async countAll(): Promise<number> {
    return this.model.count();
  }

  async create(data: any, options?: ServiceOptions<T>): Promise<T> {
    const created = await this.model.create({
      data,
      include: options?.include,
    });

    if (options)
      await this.handleMetadataAndQuality(created, "add", options, created.id);
    return created;
  }

  async update(id: string, data: any, options?: ServiceOptions<T>): Promise<T> {
    const oldEntity =
      options?.existingEntity ?? (await this.findOne(id, options?.include));
    const updated = await this.model.update({
      where: { id },
      data,
      include: options?.include,
    });

    if (options)
      await this.handleMetadataAndQuality(
        updated,
        "update",
        options,
        id,
        oldEntity,
      );
    return updated;
  }

  async delete(id: string, options?: ServiceOptions<T>): Promise<T> {
    const deleted = await this.findOne(id, options?.include ?? {});
    const applicationId = this.getApplicationId(deleted, options);

    await this.createMetadataEntry({
      applicationId,
      options,
      entity: deleted,
      entityId: id,
      type: "delete",
      newData: deleted,
    });

    await this.model.delete({ where: { id } });

    await this.updateApplicationQualitySafely(applicationId);

    return deleted;
  }

  private async handleMetadataAndQuality(
    entity: T,
    type: "add" | "update" | "delete",
    options: ServiceOptions<T>,
    entityId: string,
    oldEntity?: T,
  ) {
    await this.updateApplicationQuality(options.applicationId);

    await this.createMetadataEntry({
      applicationId: options.applicationId,
      options,
      entity,
      entityId,
      type,
      oldData: oldEntity,
      newData: entity,
    });
  }

  private getApplicationId(entity: T, options?: ServiceOptions<T>) {
    return (
      options?.applicationId ??
      (entity as unknown as { applicationId?: string }).applicationId
    );
  }

  private async createMetadataEntry({
    applicationId,
    options,
    entity,
    entityId,
    type,
    oldData,
    newData,
  }: {
    applicationId?: string;
    options?: ServiceOptions<T>;
    entity: T;
    entityId: string;
    type: "add" | "update" | "delete";
    oldData?: T;
    newData: T;
  }) {
    if (!options?.metadata || !applicationId) return;

    const columnValue = options.metadata.getColumn?.(entity);

    await this.metadataService?.createMetadata({
      applicationId,
      createdById: options.metadata.userId,
      entity: options.metadata.entity,
      entityId,
      title: columnValue
        ? `${options.metadata.gender} : ${columnValue}`
        : options.metadata.gender,
      type,
      fields: options.metadata.fields,
      oldData,
      newData,
    });
  }

  private async updateApplicationQuality(applicationId?: string) {
    if (!applicationId) return;

    await this.applicationService?.updateApplicationQuality(applicationId);
  }

  private async updateApplicationQualitySafely(applicationId?: string) {
    try {
      await this.updateApplicationQuality(applicationId);
    } catch {
      // Mise à jour best-effort : on ignore volontairement les erreurs.
    }
  }
}
