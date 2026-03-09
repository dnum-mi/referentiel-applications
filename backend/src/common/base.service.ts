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
    const oldEntity = await this.findOne(id, options?.include);
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

    const resolvedApplicationId =
      options?.applicationId ??
      (deleted as unknown as { applicationId?: string }).applicationId;

    if (options)
      await this.handleMetadataAndQuality(
        deleted,
        "delete",
        { ...options, applicationId: resolvedApplicationId },
        id,
      );

    await this.model.delete({ where: { id } });
    return deleted;
  }

  private async handleMetadataAndQuality(
    entity: T,
    type: "add" | "update" | "delete",
    options: ServiceOptions<T>,
    entityId: string,
    oldEntity?: T,
  ) {
    if (options.triggerQualityUpdate && options.applicationId)
      await this.applicationService.updateApplicationQuality(
        options.applicationId,
      );

    if (options.metadata && options.applicationId)
      await this.metadataService.createMetadata({
        applicationId: options.applicationId,
        createdById: options.metadata.userId,
        entity: options.metadata.entity,
        entityId: entityId,
        title: options.metadata.getColumn?.(entity)
          ? `${options.metadata.gender} : ${options.metadata.getColumn?.(entity)}`
          : options.metadata.gender,
        type,
        fields: options.metadata.fields,
        oldData: oldEntity,
        newData: entity,
      });
  }
}
