import { Injectable, Logger } from "@nestjs/common";
import { NotificationType, Prisma } from "@prisma/client";

type ActorWithRelations = Prisma.ActorGetPayload<{
  include: { actorType: true; organization: true; application: true };
}>;
import { BaseService } from "src/common/base.service";
import { EmailService } from "src/email/email.service";
import { NotificationService } from "src/notification/notification.service";
import { PrismaService } from "src/prisma/prisma.service";
import { ApplicationService } from "src/applications/application.service";
import {
  ActorFiltersDto,
  AdminActorFiltersDto,
  CreateActorDto,
  UpdateActorDto,
} from "./dto/actor.dto";
import { MetadatasService } from "src/metadatas/metadatas.service";
import { PaginatedResponseDto } from "src/common/dto";
import { OrganizationMaiaReferencesService } from "src/organization-maia-references/organization-maia-references.service";
import {
  getFullNameFromMaia,
  getOrganizationPathFromMaia,
} from "src/user/utils/maia.tools";

@Injectable()
export class ActorService {
  private readonly baseService: BaseService<
    ActorWithRelations,
    Prisma.ActorDelegate
  >;
  private readonly actorInclude = {
    actorType: true,
    organization: true,
    application: true,
  };

  constructor(
    private readonly applicationService: ApplicationService,
    metadataService: MetadatasService,
    private readonly emailService: EmailService,
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaService,
    private readonly organizationMaiaReferencesService: OrganizationMaiaReferencesService,
  ) {
    this.baseService = new BaseService<
      ActorWithRelations,
      Prisma.ActorDelegate
    >(prisma.actor, prisma, metadataService, applicationService);
  }

  public async create(
    createActor: CreateActorDto,
    applicationId: string,
    requestorId: string,
  ) {
    const { organizationId, actorTypeId, ...rest } = createActor;

    const createdActor = await this.baseService.create(
      {
        ...rest,
        organizationId: organizationId ?? null,
        applicationId,
        actorTypeId,
      },
      {
        applicationId,
        include: this.actorInclude,
        metadata: {
          userId: requestorId,
          gender: "de l'acteur",
          getColumn: (entity) => {
            const actorInformation = entity.email || entity.organization?.path;
            return entity.isGroup
              ? `groupe ${entity.organization?.path}`
              : `${entity.actorType?.code} : ${actorInformation}`;
          },
          entity: "actorId",
        },
      },
    );

    await this.sendActorNotificationIfEnabled(createdActor, "created");

    return createdActor;
  }

  public async count(): Promise<number> {
    return this.baseService.countAll();
  }

  public async findOne(id: string) {
    return this.baseService.findOne(id, this.actorInclude);
  }

  public async findAll(
    filters?: ActorFiltersDto,
  ): Promise<PaginatedResponseDto<ActorWithRelations>> {
    return this.baseService.findAll({
      where: filters?.applicationId
        ? { applicationId: filters.applicationId }
        : {},
      page: filters?.page,
      pageSize: filters?.pageSize,
    });
  }

  public async findAllGlobal(
    filters: AdminActorFiltersDto,
  ): Promise<PaginatedResponseDto<ActorWithRelations>> {
    const where: Prisma.ActorWhereInput = {};

    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: "insensitive" } },
        { firstname: { contains: filters.search, mode: "insensitive" } },
        { lastname: { contains: filters.search, mode: "insensitive" } },
        {
          application: {
            label: { contains: filters.search, mode: "insensitive" },
          },
        },
      ];
    }

    const orderBy: Prisma.ActorOrderByWithRelationInput = {};
    if (filters.sortBy) {
      const order = filters.order ?? "asc";
      switch (filters.sortBy) {
        case "application":
          orderBy.application = { label: order };
          break;
        case "organization":
          orderBy.organization = { path: order };
          break;
        default:
          orderBy[filters.sortBy] = order;
      }
    }

    return this.prisma.actor.paginate({
      where,
      include: this.actorInclude,
      orderBy: filters.sortBy ? orderBy : undefined,
      page: filters.page,
      pageSize: filters.pageSize,
    });
  }

  public async updateGlobal(
    id: string,
    data: UpdateActorDto,
    requestorId: string,
  ): Promise<ActorWithRelations> {
    const actor = await this.baseService.findOne(id, this.actorInclude);
    const applicationId = actor.applicationId;
    return this.update(id, data, applicationId, requestorId);
  }

  public async deleteGlobal(id: string, requestorId: string) {
    const actor = await this.baseService.findOne(id, this.actorInclude);
    const applicationId = actor.applicationId;
    return this.delete(id, applicationId, requestorId);
  }

  public async findApplicationsByEmail(email: string) {
    const actors = await this.prisma.actor.findMany({
      where: { email },
      include: { application: true },
      distinct: ["applicationId"],
    });

    return actors
      .filter((a) => a.application)
      .map((a) => ({
        id: a.application!.id,
        label: a.application!.label,
      }));
  }

  public async deleteAllByEmail(
    email: string,
    requestorId: string,
    applicationIds?: string[],
  ): Promise<{ count: number }> {
    const where: Prisma.ActorWhereInput = { email };
    if (applicationIds?.length) {
      where.applicationId = { in: applicationIds };
    }

    const actors = await this.prisma.actor.findMany({
      where,
      include: this.actorInclude,
    });

    for (const actor of actors) {
      await this.delete(actor.id, actor.applicationId, requestorId);
    }

    return { count: actors.length };
  }

  public async updateAllByEmail(
    email: string,
    data: UpdateActorDto,
    requestorId: string,
    applicationIds?: string[],
  ): Promise<{ count: number }> {
    if (data.isGroup) {
      data.firstname = "";
      data.lastname = "";
    }

    const where: Prisma.ActorWhereInput = { email };
    if (applicationIds?.length) {
      where.applicationId = { in: applicationIds };
    }

    const actors = await this.prisma.actor.findMany({
      where,
      include: this.actorInclude,
    });

    for (const actor of actors) {
      await this.update(actor.id, data, actor.applicationId, requestorId);
    }

    return { count: actors.length };
  }

  public async update(
    id: string,
    data: UpdateActorDto,
    applicationId: string,
    requestorId: string,
  ): Promise<ActorWithRelations> {
    const oldActor = await this.baseService.findOne(id, this.actorInclude);

    const { organizationId, actorTypeId, ...rest } = data;

    const updatedActor = await this.baseService.update(
      id,
      {
        ...rest,
        ...(organizationId !== undefined && {
          organizationId: organizationId || null,
        }),
        ...(actorTypeId !== undefined && { actorTypeId }),
      },
      {
        existingEntity: oldActor,
        applicationId,
        include: this.actorInclude,
        metadata: {
          userId: requestorId,
          gender: "de l'acteur",
          getColumn: (entity) =>
            entity.isGroup
              ? `groupe d'acteur ${entity.organization?.path}`
              : `${entity.actorType?.code}`,
          entity: "actorId",
          fields: {
            lastname: "nom",
            firstname: "prénom",
            email: "email",
            isGroup: "groupe",
            "organization.sigle": "organisation",
            "actorType.label": "rôle",
          },
        },
      },
    );

    const changedFieldLabels = oldActor
      ? this.getChangedFieldLabels(oldActor, updatedActor)
      : [];

    await this.sendActorNotificationIfEnabled(
      updatedActor,
      "updated",
      changedFieldLabels,
    );

    return updatedActor;
  }

  private getChangedFieldLabels(
    oldActor: Prisma.ActorGetPayload<{ include: { actorType: true } }>,
    newActor: Prisma.ActorGetPayload<{ include: { actorType: true } }>,
  ): string[] {
    const changes: string[] = [];

    const fieldLabels = {
      firstname: "Prénom",
      lastname: "Nom",
      email: "Email",
    } as const;

    type Field = keyof typeof fieldLabels;
    const fields = Object.keys(fieldLabels) as Field[];

    for (const field of fields) {
      const label = fieldLabels[field];
      if (oldActor[field] !== newActor[field]) {
        changes.push(label);
      }
    }

    const fieldActorLabels = {
      label: "Type d'acteur",
    } as const;

    type FieldActor = keyof typeof fieldActorLabels;
    const fieldsActor = Object.keys(fieldActorLabels) as FieldActor[];

    for (const field of fieldsActor) {
      const label = fieldActorLabels[field];
      if (oldActor.actorType[field] !== newActor.actorType[field]) {
        changes.push(label);
      }
    }

    return changes;
  }

  private static changedFieldLabelsToHtml(labels: string[]): string {
    return labels
      .map(
        (label) =>
          `<p style="margin: 5px 0; font-size: 14px; color: #161616;">• <strong>${label}</strong></p>`,
      )
      .join("");
  }

  public async delete(id: string, applicationId: string, requestorId: string) {
    return this.baseService.delete(id, {
      applicationId,
      include: this.actorInclude,
      metadata: {
        userId: requestorId,
        gender: "de l'acteur",
        getColumn: (entity) =>
          entity.isGroup
            ? `groupe d'acteur ${entity.organization?.path}`
            : `${entity.actorType?.code} : ${entity.email}`,
        entity: "actorId",
      },
    });
  }

  startSyncActorsFromMaiaInBackground() {
    this.syncAllActorsFromMaia();
    return {
      status: "queued" as const,
      message: "Tâche de synchronisation MAIA des acteurs lancée.",
    };
  }

  async syncAllActorsFromMaia() {
    const actors = await this.prisma.actor.findMany({
      where: { email: { not: null }, isGroup: false },
      select: { id: true, email: true },
    });

    for (const actor of actors) {
      try {
        const [
          organizationPath,
          { firstName: firstNameFromMaia, lastName: lastNameFromMaia },
        ] = await Promise.all([
          getOrganizationPathFromMaia(actor.email),
          getFullNameFromMaia(actor.email),
        ]);

        const updateData: Prisma.ActorUpdateInput = {};

        if (firstNameFromMaia) {
          updateData.firstname = firstNameFromMaia;
        }
        if (lastNameFromMaia) {
          updateData.lastname = lastNameFromMaia;
        }
        if (organizationPath) {
          const { organization } =
            await this.findOrCreateOrganizationFromPath(organizationPath);
          updateData.organization = { connect: { id: organization.id } };
        }

        await this.prisma.actor.update({
          where: { id: actor.id },
          data: updateData,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        Logger.warn(
          `Échec de la synchronisation MAIA pour l'acteur ${actor.email}: ${message}`,
        );
      }
    }
  }

  private async findOrCreateOrganizationFromPath(path: string) {
    const orgFromOverride =
      await this.organizationMaiaReferencesService.findOrganizationByMaiaRef(
        path,
      );
    if (orgFromOverride) {
      return { organization: orgFromOverride };
    }

    const existing = await this.prisma.organization.findFirst({
      where: { path },
      select: { id: true },
    });
    if (existing) {
      return { organization: existing };
    }

    const newOrg = await this.prisma.organization.create({
      data: { path },
      select: { id: true },
    });
    return { organization: newOrg };
  }

  private async sendActorNotificationIfEnabled(
    actor: Pick<
      ActorWithRelations,
      "email" | "firstname" | "lastname" | "applicationId"
    >,
    event: "created" | "updated" = "created",
    changedFieldLabels: string[] = [],
  ): Promise<void> {
    if (!actor.email) {
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { email: actor.email },
      select: { id: true, emailNotificationsEnabled: true },
    });

    const actorName =
      [actor.firstname, actor.lastname].filter(Boolean).join(" ") ||
      actor.email;

    let applicationName: string | undefined;

    if (actor.applicationId) {
      try {
        const application = await this.applicationService.getApplicationById(
          actor.applicationId,
        );
        applicationName = application?.label;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        Logger.warn(
          `Could not fetch application ${actor.applicationId} for email notification: ${message}`,
        );
      }
    }

    const emailNotificationsEnabled = user?.emailNotificationsEnabled ?? true;
    let emailLog = null;

    if (!emailNotificationsEnabled) {
      Logger.log(
        `Email notifications disabled for user ${actor.email}. Skipping notification.`,
      );
    } else if (event === "created") {
      emailLog = await this.emailService.sendActorAddedNotification(
        actor.email,
        actorName,
        applicationName,
      );
    } else {
      emailLog = await this.emailService.sendActorModifiedNotification(
        actor.email,
        actorName,
        applicationName,
        ActorService.changedFieldLabelsToHtml(changedFieldLabels),
      );
    }

    if (user) {
      const changedFieldsSuffix =
        changedFieldLabels.length > 0
          ? ` (${changedFieldLabels.join(", ")})`
          : "";
      const message =
        event === "created"
          ? `Vous avez été ajouté comme acteur${applicationName ? ` sur ${applicationName}` : ""}.`
          : `Vos informations d'acteur${applicationName ? ` sur ${applicationName}` : ""} ont été modifiées${changedFieldsSuffix}.`;
      await this.notificationService.create(
        user.id,
        event === "created"
          ? NotificationType.actor_added
          : NotificationType.actor_modified,
        message,
        {
          link: actor.applicationId
            ? `/applications/${actor.applicationId}`
            : undefined,
          applicationId: actor.applicationId ?? undefined,
          emailLogId: emailLog?.id,
        },
      );
    }
  }
}
