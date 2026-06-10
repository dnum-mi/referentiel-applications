import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";

type ActorWithRelations = Prisma.ActorGetPayload<{
  include: { actorType: true; organization: true; application: true };
}>;
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
        Logger.warn(
          `Échec de la synchronisation MAIA pour l'acteur ${actor.email}: ${error}`,
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
