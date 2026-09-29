import type { ApplicationService } from "src/applications/application.service";
import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { MetadatasService } from "src/metadatas/metadatas.service";
import type { PrismaService } from "src/prisma/prisma.service";
import { ServiceOptions } from "./utils/types";
import { PaginatedResponseDto, PaginationDto } from "./dto";

/**
 * Adaptateur des délégués Prisma étendus : les arguments restent propres au
 * modèle, tandis que T représente le résultat normalisé (notamment Decimal).
 */
export interface BaseModelDelegate<T, TDelegate> {
  readonly name?: string;
  findUnique(args: {
    where: { id: string };
    include?: Prisma.Args<TDelegate, "findUnique">["include"];
  }): Prisma.PrismaPromise<T | null>;
  findFirst(
    args?: Prisma.Args<TDelegate, "findFirst">,
  ): Prisma.PrismaPromise<T | null>;
  findMany(
    args?: Prisma.Args<TDelegate, "findMany">,
  ): Prisma.PrismaPromise<T[]>;
  count(args?: Prisma.Args<TDelegate, "count">): Prisma.PrismaPromise<number>;
  create(args: {
    data: Prisma.Args<TDelegate, "create">["data"];
    include?: Prisma.Args<TDelegate, "create">["include"];
  }): Prisma.PrismaPromise<T>;
  update(args: {
    where: { id: string };
    data: Prisma.Args<TDelegate, "update">["data"];
    include?: Prisma.Args<TDelegate, "update">["include"];
  }): Prisma.PrismaPromise<T>;
  delete(args: { where: { id: string } }): Prisma.PrismaPromise<T>;
  paginate(
    args?: Prisma.Args<TDelegate, "findMany"> &
      Pick<PaginationDto, "page" | "pageSize">,
  ): Promise<PaginatedResponseDto<T>>;
}

@Injectable()
export class BaseService<T extends { id: string }, TDelegate extends object> {
  protected readonly model: BaseModelDelegate<T, TDelegate>;

  constructor(
    model: TDelegate,
    protected readonly prisma: PrismaService,
    private readonly metadataService?: MetadatasService,
    private readonly applicationService?: ApplicationService,
  ) {
    // Les extensions normalisent les résultats sans modifier les arguments.
    // Cette adaptation est limitée à la frontière du client Prisma ; chaque
    // service doit fournir explicitement son délégué pour conserver ses types.
    this.model = model as unknown as BaseModelDelegate<T, TDelegate>;
  }

  async findOne(
    id: string,
    include?: Prisma.Args<TDelegate, "findUnique">["include"],
  ): Promise<T> {
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

  async create(
    data: Prisma.Args<TDelegate, "create">["data"],
    options?: ServiceOptions<T, TDelegate>,
  ): Promise<T> {
    const created = await this.model.create({
      data,
      include: options?.include,
    });

    if (options)
      await this.handleMetadataAndQuality(created, "add", options, created.id);
    return created;
  }

  async update(
    id: string,
    data: Prisma.Args<TDelegate, "update">["data"],
    options?: ServiceOptions<T, TDelegate>,
  ): Promise<T> {
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

  async delete(id: string, options?: ServiceOptions<T, TDelegate>): Promise<T> {
    const deleted = await this.findOne(id, options?.include);
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
    await this.recordQualityCampaignActionsSafely(applicationId);

    return deleted;
  }

  private async handleMetadataAndQuality(
    entity: T,
    type: "add" | "update" | "delete",
    options: ServiceOptions<T, TDelegate>,
    entityId: string,
    oldEntity?: T,
  ) {
    await this.updateApplicationQuality(options.applicationId);
    await this.recordQualityCampaignActionsSafely(
      options.applicationId,
      options.metadata?.userId,
    );

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

  private getApplicationId(entity: T, options?: ServiceOptions<T, TDelegate>) {
    return (
      options?.applicationId ??
      ("applicationId" in entity && typeof entity.applicationId === "string"
        ? entity.applicationId
        : undefined)
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
    options?: ServiceOptions<T, TDelegate>;
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

  // recordQualityCampaignActions est déjà best-effort en interne (cf. ApplicationService), ce
  // wrapper protège seulement contre son absence (applicationService non fourni au constructeur).
  private async recordQualityCampaignActionsSafely(
    applicationId?: string,
    userId?: string,
  ) {
    if (!applicationId) return;
    await this.applicationService?.recordQualityCampaignActions(
      applicationId,
      userId,
    );
  }
}
