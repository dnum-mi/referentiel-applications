import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  NotificationType,
  Prisma,
  QualityCampaign,
  QualityCampaignTarget,
  Roles,
} from "@prisma/client";
import type { Application } from "@prisma/client";
import { ApplicationSearchDto } from "src/applications/dto/search-application.dto";
import { ApplicationService } from "src/applications/application.service";
import { EmailService } from "src/email/email.service";
import { NotificationService } from "src/notification/notification.service";
import { roleToPermissions } from "src/permissions/role-to-permissions";
import { PrismaService } from "src/prisma/prisma.service";
import type { Requestor } from "src/user/entities/user.entity";
import { PaginationDto } from "src/common/dto";
import {
  CreateQualityCampaignDto,
  UpdateQualityCampaignDto,
} from "./dto/create-quality-campaign.dto";
import { QualityCampaignDto } from "./dto/quality-campaign.dto";

/**
 * Codes ActorType habilités à recevoir la relance de campagne, alignés sur le rôle « responsable
 * fonctionnel/technique » utilisé par les autres relances automatiques (cf.
 * application-validation-cron.service.ts).
 */
const ACTOR_TYPE_CODES = ["MOA", "MOE"];

type QualityCampaignWithTargets = QualityCampaign & {
  targets: (QualityCampaignTarget & {
    application: { label: string; quality: number | null };
  })[];
};

const TARGETS_INCLUDE = {
  targets: {
    include: { application: { select: { label: true, quality: true } } },
  },
} as const;

/**
 * Requestor de service utilisé pour résoudre les applications ciblées par une campagne en
 * dehors de tout contexte HTTP (cron). Permissions ADMIN complètes : la résolution des cibles
 * ne doit pas être restreinte par un périmètre utilisateur, la campagne étant elle-même une
 * fonctionnalité admin (#2282).
 */
const SYSTEM_REQUESTOR: Requestor = {
  id: "quality-campaign-system",
  email: "quality-campaign@system.local",
  role: Roles.ADMIN,
  organizationId: null,
  scopeOrganizationId: null,
  type: "bot",
  isBlocked: false,
  additionalPermissions: [],
  permissions: roleToPermissions(Roles.ADMIN),
  appPerms: [],
};

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Traduit le tri demandé par l'admin (colonnes de l'onglet) vers l'`orderBy` Prisma
 * correspondant. `status` et `targetCount` ne sont pas des colonnes réelles : le premier se
 * déduit de `sentAt` (scheduled = null, sent = renseigné), le second du comptage de la relation
 * `targets`.
 */
function buildOrderBy(
  sortBy: string | undefined,
  order: "asc" | "desc" = "desc",
): Prisma.QualityCampaignOrderByWithRelationInput {
  switch (sortBy) {
    case "name":
      return { name: order };
    case "endDate":
      return { endDate: order };
    case "status":
      return { sentAt: order };
    case "targetCount":
      return { targets: { _count: order } };
    case "startDate":
    default:
      return { startDate: order };
  }
}

@Injectable()
export class QualityCampaignService {
  private readonly logger = new Logger(QualityCampaignService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly applicationService: ApplicationService,
    private readonly emailService: EmailService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(userId: string, dto: CreateQualityCampaignDto) {
    const campaign = await this.prisma.qualityCampaign.create({
      data: {
        name: dto.name,
        filters: dto.filters as Prisma.InputJsonValue,
        message: dto.message,
        sponsorEmails: dto.sponsorEmails ?? [],
        startDate: dto.startDate,
        endDate: dto.endDate,
        createdById: userId,
      },
      include: TARGETS_INCLUDE,
    });
    return this.toDto(campaign);
  }

  async findAll(filters: PaginationDto) {
    const paginated = await this.prisma.qualityCampaign.paginate({
      orderBy: buildOrderBy(filters.sortBy, filters.order),
      page: filters.page,
      pageSize: filters.pageSize,
      include: {
        targets: {
          include: { application: { select: { label: true, quality: true } } },
        },
      },
    });
    return {
      ...paginated,
      results: paginated.results.map((campaign) =>
        this.toDto(campaign as QualityCampaignWithTargets),
      ),
    };
  }

  async findOne(id: string): Promise<QualityCampaignDto> {
    return this.toDto(await this.getRaw(id));
  }

  async update(id: string, dto: UpdateQualityCampaignDto) {
    const campaign = await this.getRaw(id);
    if (
      campaign.sentAt &&
      (dto.filters !== undefined || dto.startDate !== undefined)
    ) {
      throw new BadRequestException(
        "Impossible de modifier le filtre ou la date de début d'une campagne déjà envoyée.",
      );
    }
    const updated = await this.prisma.qualityCampaign.update({
      where: { id },
      data: {
        name: dto.name,
        filters: dto.filters as Prisma.InputJsonValue | undefined,
        message: dto.message,
        sponsorEmails: dto.sponsorEmails,
        startDate: dto.startDate,
        endDate: dto.endDate,
      },
      include: TARGETS_INCLUDE,
    });
    return this.toDto(updated);
  }

  async delete(id: string) {
    await this.getRaw(id);
    await this.prisma.qualityCampaign.delete({ where: { id } });
  }

  async preview(id: string, requestor: Requestor) {
    const campaign = await this.getRaw(id);
    const result = await this.searchTargets(campaign, requestor);
    return { matchedCount: result.total, averageIq: result.averageIq };
  }

  /**
   * Résout les applications ciblées par la campagne, snapshot leur IQ courant comme
   * `iqAtStart`, puis relance par email les acteurs MOA/MOE de chacune. Appelable
   * manuellement (admin, avec le `requestor` réel) ou automatiquement par le cron à la date de
   * début (sans `requestor` : utilise SYSTEM_REQUESTOR).
   */
  async sendCampaign(
    id: string,
    requestor?: Requestor,
  ): Promise<QualityCampaignDto> {
    const campaign = await this.getRaw(id);
    if (campaign.sentAt) {
      throw new BadRequestException("Cette campagne a déjà été envoyée.");
    }

    const { results: applications } = await this.searchTargets(
      campaign,
      requestor ?? SYSTEM_REQUESTOR,
    );

    if (applications.length > 0) {
      await this.prisma.qualityCampaignTarget.createMany({
        data: applications.map((application) => ({
          campaignId: id,
          applicationId: application.id,
          iqAtStart: application.quality,
        })),
        skipDuplicates: true,
      });

      for (const application of applications) {
        await this.notifyApplicationActors(campaign, application);
      }
    }

    await this.prisma.qualityCampaign.update({
      where: { id },
      data: { sentAt: new Date() },
    });

    return this.findOne(id);
  }

  /**
   * Envoie au sponsor un email récapitulatif de l'impact courant de la campagne (IQ de départ
   * vs IQ actuel des applications ciblées). Répétable, indépendant de l'envoi initial aux
   * acteurs : c'est le mécanisme dédié « pouvoir leur envoyer le résultat » (#2282).
   */
  async sendSponsorReport(id: string) {
    const campaign = await this.getRaw(id);
    if (!campaign.sentAt) {
      throw new BadRequestException(
        "La campagne doit avoir été envoyée avant de pouvoir en rapporter les résultats.",
      );
    }
    if (campaign.sponsorEmails.length === 0) {
      throw new BadRequestException(
        "Aucun email sponsor n'est renseigné pour cette campagne.",
      );
    }

    const impact = this.computeImpact(campaign);
    const emailLog =
      await this.emailService.sendQualityCampaignSponsorReportEmail({
        recipientEmails: campaign.sponsorEmails,
        campaignName: campaign.name,
        targets: campaign.targets.map((target) => ({
          applicationId: target.applicationId,
          applicationLabel: target.application.label,
          iqAtStart: target.iqAtStart,
          iqCurrent: target.application.quality,
        })),
        averageIqAtStart: impact.averageIqAtStart,
        averageIqCurrent: impact.averageIqCurrent,
        averageDelta: impact.averageDelta,
      });

    // Notification in-app pour les sponsors correspondant à un compte User existant (canal
    // séparé de l'email, best-effort — cf. notifyApplicationActors). Un seul email combiné ayant
    // été envoyé à tous les sponsors, ils partagent le même emailLogId.
    const sponsorUsers = await this.prisma.user.findMany({
      where: { email: { in: campaign.sponsorEmails } },
      select: { id: true },
    });
    await this.notificationService.createForUsers(
      sponsorUsers.map((user) => user.id),
      NotificationType.campaign_quality_sponsor_report,
      `Le rapport de résultats de la campagne qualité « ${campaign.name} » a été envoyé.`,
      { link: "/administration", emailLogId: emailLog?.id },
    );

    return this.findOne(id);
  }

  private async searchTargets(campaign: QualityCampaign, requestor: Requestor) {
    return this.applicationService.search(
      {
        ...(campaign.filters as Record<string, unknown>),
        page: 0,
        pageSize: 0,
      } as ApplicationSearchDto,
      requestor,
    );
  }

  private async notifyApplicationActors(
    campaign: QualityCampaign,
    application: Pick<Application, "id" | "label" | "quality">,
  ) {
    const actors = await this.prisma.actor.findMany({
      where: {
        applicationId: application.id,
        email: { not: null },
        actorType: { code: { in: ACTOR_TYPE_CODES, mode: "insensitive" } },
      },
      select: { email: true },
    });

    const recipientEmails = [
      ...new Set(
        actors
          .map((actor) => actor.email)
          .filter((email): email is string => Boolean(email)),
      ),
    ];
    if (recipientEmails.length === 0) return;

    // Notification in-app créée pour tout utilisateur correspondant, indépendamment de sa
    // préférence email (canal séparé) — même logique que application-validation-cron.service.ts.
    const recipientUsers = await this.prisma.user.findMany({
      where: { email: { in: recipientEmails } },
      select: { id: true, email: true },
    });

    const optedOutUsers = await this.prisma.user.findMany({
      where: {
        email: { in: recipientEmails },
        emailNotificationsEnabled: false,
      },
      select: { email: true },
    });
    const optedOutEmails = new Set(optedOutUsers.map((user) => user.email));
    const eligibleEmails = recipientEmails.filter(
      (email) => !optedOutEmails.has(email),
    );

    const emailLogIdByEmail = new Map<string, string>();
    for (const recipientEmail of eligibleEmails) {
      try {
        const emailLog =
          await this.emailService.sendQualityCampaignReminderEmail({
            recipientEmail,
            applicationId: application.id,
            applicationLabel: application.label,
            currentIq: application.quality,
            campaignName: campaign.name,
            message: campaign.message,
          });
        if (emailLog) {
          emailLogIdByEmail.set(recipientEmail, emailLog.id);
        }
      } catch (error) {
        this.logger.error(
          `Échec d'envoi de la relance campagne à ${recipientEmail} pour ${application.id}:`,
          error,
        );
      }
    }

    await Promise.all(
      recipientUsers.map((user) =>
        this.notificationService.create(
          user.id,
          NotificationType.campaign_quality_reminder,
          `Votre application ${application.label} est ciblée par la campagne qualité « ${campaign.name} ».`,
          {
            link: `/applications/${application.id}`,
            applicationId: application.id,
            emailLogId: emailLogIdByEmail.get(user.email),
          },
        ),
      ),
    );
  }

  private computeImpact(campaign: QualityCampaignWithTargets) {
    const targets = campaign.targets;
    const withStart = targets
      .map((target) => target.iqAtStart)
      .filter((iq): iq is number => iq != null);
    const withCurrent = targets
      .map((target) => target.application.quality)
      .filter((iq): iq is number => iq != null);
    const deltas = targets
      .filter(
        (target) =>
          target.iqAtStart != null && target.application.quality != null,
      )
      .map(
        (target) =>
          (target.application.quality as number) - (target.iqAtStart as number),
      );

    return {
      targetCount: targets.length,
      averageIqAtStart: average(withStart),
      averageIqCurrent: average(withCurrent),
      averageDelta: average(deltas),
    };
  }

  private toDto(campaign: QualityCampaignWithTargets): QualityCampaignDto {
    const impact = this.computeImpact(campaign);
    return {
      id: campaign.id,
      name: campaign.name,
      filters: campaign.filters as Record<string, unknown>,
      message: campaign.message,
      sponsorEmails: campaign.sponsorEmails,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      sentAt: campaign.sentAt,
      createdAt: campaign.createdAt,
      status: campaign.sentAt ? "sent" : "scheduled",
      ...impact,
    };
  }

  private async getRaw(id: string): Promise<QualityCampaignWithTargets> {
    const campaign = await this.prisma.qualityCampaign.findUnique({
      where: { id },
      include: TARGETS_INCLUDE,
    });
    if (!campaign) {
      throw new NotFoundException(
        `Campagne qualité avec l'id ${id} non trouvée`,
      );
    }
    return campaign;
  }
}
