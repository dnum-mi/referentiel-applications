import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Actor, Prisma } from "@prisma/client";
import { BaseService } from "src/common/base.service";
import { EmailService } from "src/email/email.service";
import { PrismaService } from "src/prisma/prisma.service";
import { ApplicationService } from "src/applications/application.service";
import {
  ActorFiltersDto,
  CreateActorDto,
  UpdateActorDto,
} from "./dto/actor.dto";
import { MetadatasService } from "src/metadatas/metadatas.service";
import { PaginatedResponseDto } from "src/common/dto";

@Injectable()
export class ActorService {
  private readonly baseService: BaseService<Actor, Prisma.ActorDelegate>;

  constructor(
    private readonly applicationService: ApplicationService,
    private readonly metadataService: MetadatasService,
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
  ) {
    this.baseService = new BaseService<Actor, Prisma.ActorDelegate>(
      prisma.actor,
      prisma,
      metadataService,
      applicationService,
    );
  }

  public async create(createActor: CreateActorDto, requestorId: string) {
    const { organizationId, applicationId, actorTypeId, ...rest } = createActor;

    const createdActor = await this.prisma.actor.create({
      data: {
        ...rest,
        organizationId: organizationId ?? null,
        applicationId: applicationId ?? null,
        actorTypeId,
      },
      include: {
        actorType: true,
        organization: true,
      },
    });

    const actorInformation =
      createdActor.email.length > 0
        ? createdActor.email
        : createdActor.organization.path;
    await this.metadataService.createMetadata({
      applicationId: createActor.applicationId,
      createdById: requestorId,
      entity: "actorId",
      entityId: createdActor.id,
      title: `de l'acteur ${createdActor.actorType?.code} : ${actorInformation}`,
      type: "add",
    });

    await this.applicationService.updateApplicationQuality(
      createdActor.applicationId,
    );

    await this.sendActorNotificationIfEnabled(createdActor, "created");

    return createdActor;
  }

  public async count(): Promise<number> {
    return this.baseService.countAll();
  }

  public async findOne(id: string) {
    const actor = await this.prisma.actor.findUnique({
      where: { id },
      include: {
        organization: true,
        application: true,
        actorType: true,
      },
    });

    if (!actor) {
      throw new NotFoundException(`Acteur non trouvé pour l'ID ${id}`);
    }
    return actor;
  }

  public async findAll(
    filters?: ActorFiltersDto,
  ): Promise<PaginatedResponseDto<Actor>> {
    return this.baseService.findAll({
      where: filters?.applicationId
        ? { applicationId: filters.applicationId }
        : {},
      page: filters?.page,
      pageSize: filters?.pageSize,
    });
  }

  public async update(params: {
    where: Prisma.ActorWhereUniqueInput;
    data: UpdateActorDto;
    requestorId: string;
  }): Promise<Actor> {
    const { where, data, requestorId } = params;

    let oldActor = await this.findOne(where.id);

    const { organizationId, applicationId, actorTypeId, ...rest } = data;

    const updatedActor = await this.prisma.actor.update({
      where,
      data: {
        ...rest,
        ...(organizationId !== undefined && {
          organizationId: organizationId || null,
        }),
        ...(applicationId !== undefined && {
          applicationId: applicationId || null,
        }),
        ...(actorTypeId !== undefined && { actorTypeId }),
      },
      include: {
        organization: true,
        application: true,
        actorType: true,
      },
    });

    await this.applicationService.updateApplicationQuality(
      updatedActor.applicationId,
    );

    await this.metadataService.createMetadata({
      applicationId: updatedActor.applicationId,
      createdById: requestorId,
      title: `de l'acteur ${oldActor.actorType?.code}`,
      entity: "actorId",
      entityId: updatedActor.id,
      fields: {
        lastname: "nom",
        firstname: "prénom",
        email: "email",
        "organization.sigle": "organisation",
        "actorType.label": "rôle",
      },
      oldData: oldActor,
      newData: updatedActor,
    });

    const changedFields = oldActor
      ? this.getChangedFieldsHtml(oldActor, updatedActor)
      : "";

    await this.sendActorNotificationIfEnabled(
      updatedActor,
      "updated",
      changedFields,
    );

    return updatedActor;
  }

  private getChangedFieldsHtml(
    oldActor: Prisma.ActorGetPayload<{ include: { actorType: true } }>,
    newActor: Prisma.ActorGetPayload<{ include: { actorType: true } }>,
  ): string {
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
        changes.push(
          `<p style="margin: 5px 0; font-size: 14px; color: #161616;">• <strong>${label}</strong></p>`,
        );
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
        changes.push(
          `<p style="margin: 5px 0; font-size: 14px; color: #161616;">• <strong>${label}</strong></p>`,
        );
      }
    }

    return changes.length > 0 ? changes.join("") : "";
  }

  public async delete(id: string, requestorId: string) {
    const actor = await this.findOne(id);

    await this.metadataService.createMetadata({
      applicationId: actor.applicationId,
      createdById: requestorId,
      entity: "actorId",
      entityId: actor.id,
      title: `de l'acteur ${actor.actorType.code} : ${actor.email}`,
      type: "delete",
    });

    await this.applicationService.updateApplicationQuality(actor.applicationId);

    return this.prisma.actor.delete({ where: { id } });
  }

  private async sendActorNotificationIfEnabled(
    actor: any,
    event: "created" | "updated" = "created",
    changedFieldsHtml?: string,
  ): Promise<void> {
    if (!actor.email) {
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { email: actor.email },
      select: { emailNotificationsEnabled: true },
    });

    const emailNotificationsEnabled = user?.emailNotificationsEnabled ?? true;

    if (!emailNotificationsEnabled) {
      Logger.log(
        `Email notifications disabled for user ${actor.email}. Skipping notification.`,
      );
      return;
    }

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
        Logger.warn(
          `Could not fetch application ${actor.applicationId} for email notification: ${error}`,
        );
      }
    }

    if (event === "created") {
      await this.emailService.sendActorAddedNotification(
        actor.email,
        actorName,
        applicationName,
      );
    } else {
      await this.emailService.sendActorModifiedNotification(
        actor.email,
        actorName,
        applicationName,
        changedFieldsHtml || "",
      );
    }
  }
}
