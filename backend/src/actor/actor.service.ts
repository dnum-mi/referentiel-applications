import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Actor, Prisma } from "@prisma/client";
import { EmailService } from "src/email/email.service";
import { PrismaService } from "src/prisma/prisma.service";
import { ApplicationService } from "src/product/application.service";
import { CreateActorDto, UpdateActorDto } from "./dto/actor.dto";
import { ActorRepository } from "./infrastructure/repository/actor.repository";

@Injectable()
export class ActorService {
  constructor(
    private readonly actorRepository: ActorRepository,
    private readonly applicationService: ApplicationService,
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
  ) {}

  public async create(createActor: CreateActorDto, requestorId: string) {
    const createdActor = await this.actorRepository.create(
      createActor,
      requestorId,
    );
    await this.applicationService.updateApplicationQuality(
      createdActor.applicationId,
    );

    await this.sendActorNotificationIfEnabled(createdActor, "created");

    return createdActor;
  }

  public async count(): Promise<number> {
    return this.actorRepository.count();
  }

  public async findOne(id: string) {
    const actor = await this.actorRepository.findById(id);
    if (!actor) {
      throw new NotFoundException(`Acteur non trouvé pour l'ID ${id}`);
    }
    return actor;
  }

  public async findAll(applicationId?: string) {
    return this.actorRepository.findAll(applicationId);
  }

  public async update(params: {
    where: Prisma.ActorWhereUniqueInput;
    data: UpdateActorDto;
    requestorId: string;
  }): Promise<Actor> {
    const { where, data, requestorId } = params;

    let oldActor: Actor | undefined;
    if ("id" in where && typeof where.id === "string" && where.id) {
      oldActor = await this.findOne(where.id);
    }

    const updatedActor = await this.actorRepository.update(
      where,
      data,
      requestorId,
    );

    await this.applicationService.updateApplicationQuality(
      updatedActor.applicationId,
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

  private getChangedFieldsHtml(oldActor: Actor, newActor: Actor): string {
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

    return changes.length > 0 ? changes.join("") : "";
  }

  public async delete(id: string, requestorId: string) {
    const actor = await this.findOne(id);
    const deletedActor = await this.actorRepository.delete(id, requestorId);
    await this.applicationService.updateApplicationQuality(actor.applicationId);
    return deletedActor;
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
