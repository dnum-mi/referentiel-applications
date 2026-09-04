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
  QualityCampaignStatus,
  QualityCampaignTarget,
  Roles,
} from "@prisma/client";
import type { Application } from "@prisma/client";
import { emailIn } from "src/common/utils/email.utils";
import { ApplicationSearchDto } from "src/applications/dto/search-application.dto";
import { ApplicationService } from "src/applications/application.service";
import { getQualityActionLabel } from "src/common/utils/quality-actions.utils";
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
 * correspondant. `targetCount` n'est pas une colonne réelle : elle se déduit du comptage de la
 * relation `targets`.
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
      return { status: order };
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

  async create(
    userId: string,
    dto: CreateQualityCampaignDto,
    requestor: Requestor,
  ) {
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
    return this.toDtoWithLiveTargetCount(campaign, requestor);
  }

  async findAll(filters: PaginationDto, requestor: Requestor) {
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
    const results = await Promise.all(
      paginated.results.map((campaign) =>
        this.toDtoWithLiveTargetCount(
          campaign as QualityCampaignWithTargets,
          requestor,
        ),
      ),
    );
    return { ...paginated, results };
  }

  async findOne(
    id: string,
    requestor: Requestor = SYSTEM_REQUESTOR,
  ): Promise<QualityCampaignDto> {
    return this.toDtoWithLiveTargetCount(await this.getRaw(id), requestor);
  }

  async update(id: string, dto: UpdateQualityCampaignDto) {
    const campaign = await this.getRaw(id);
    if (
      campaign.status !== QualityCampaignStatus.scheduled &&
      dto.filters !== undefined
    ) {
      throw new BadRequestException(
        "Impossible de modifier le filtre d'une campagne qui n'est plus planifiée.",
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
   * `iqAtStart`, relance par email les acteurs MOA/MOE de chacune, puis pose `sentAt`. Étape
   * commune à l'envoi explicite (`sendCampaign`) et au passage manuel du statut hors
   * « planifiée » d'une campagne jamais envoyée (`updateStatus`) : dans les deux cas la campagne
   * doit avoir réellement ciblé des applications, pas juste changé d'étiquette.
   *
   * Verrou optimiste (#2376) : `sentAt` est posé de façon ATOMIQUE avant tout envoi, via un
   * `updateMany` conditionné sur `sentAt: null`. Deux déclencheurs concurrents (double-clic, cron
   * + changement de statut manuel, deux réplicas) liraient sinon `sentAt = null` avant que l'un
   * pose la date, et enverraient donc la campagne en double. Ici, seule l'exécution dont
   * l'`updateMany` affecte 1 ligne poursuit ; l'autre lève une erreur. Poser la date AVANT
   * l'envoi garantit « au plus une fois » (pas de doublon massif d'emails), au prix d'un envoi
   * potentiellement partiel si le process meurt en cours — compromis assumé.
   */
  private async resolveAndNotifyTargets(
    id: string,
    campaign: QualityCampaign,
    requestor?: Requestor,
  ): Promise<void> {
    const claimed = await this.prisma.qualityCampaign.updateMany({
      where: { id, sentAt: null },
      data: { sentAt: new Date() },
    });
    if (claimed.count === 0) {
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
  }

  /**
   * Déclenche immédiatement la résolution des cibles et la relance des acteurs. Appelable
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

    await this.resolveAndNotifyTargets(id, campaign, requestor);

    // N'avance le statut que s'il est encore à sa valeur par défaut : si l'admin l'a déjà corrigé
    // manuellement (ex. repassé à `done`), on ne l'écrase pas. `sentAt` est déjà posé par
    // resolveAndNotifyTargets (verrou atomique #2376).
    if (campaign.status === QualityCampaignStatus.scheduled) {
      await this.prisma.qualityCampaign.update({
        where: { id },
        data: { status: QualityCampaignStatus.in_progress },
      });
    }

    return this.findOne(id, requestor);
  }

  /**
   * Change librement le statut de la campagne, dans n'importe quel sens (#2282 amélioration) :
   * aucune restriction de transition, c'est un statut manuel dont l'admin garde le contrôle. Si
   * la campagne est encore « planifiée » (jamais envoyée) et qu'on la fait sortir de cet état,
   * on résout d'abord ses cibles et relance ses acteurs — sinon elle passerait « en cours » ou
   * « terminée » sans avoir jamais réellement ciblé la moindre application.
   */
  async updateStatus(
    id: string,
    status: QualityCampaignStatus,
    requestor?: Requestor,
  ) {
    const campaign = await this.getRaw(id);

    if (status !== QualityCampaignStatus.scheduled && !campaign.sentAt) {
      await this.resolveAndNotifyTargets(id, campaign, requestor);
    }

    await this.prisma.qualityCampaign.update({
      where: { id },
      data: { status },
    });

    return this.findOne(id, requestor);
  }

  /**
   * Envoie au sponsor un email récapitulatif de l'impact courant de la campagne (IQ de départ
   * vs IQ actuel des applications ciblées). Répétable, indépendant de l'envoi initial aux
   * acteurs, et disponible quel que soit le statut de la campagne : c'est le mécanisme dédié
   * « pouvoir leur envoyer le résultat » (#2282).
   */
  async sendSponsorReport(id: string) {
    const campaign = await this.getRaw(id);
    if (campaign.sponsorEmails.length === 0) {
      throw new BadRequestException(
        "Aucun email sponsor n'est renseigné pour cette campagne.",
      );
    }

    const impact = this.computeImpact(campaign);
    const actionLogs = await this.prisma.qualityCampaignActionLog.findMany({
      where: { campaignId: id },
      select: { applicationId: true, actionKey: true },
    });
    const actionLabelsByApplicationId = new Map<string, string[]>();
    for (const log of actionLogs) {
      const labels = actionLabelsByApplicationId.get(log.applicationId) ?? [];
      labels.push(getQualityActionLabel(log.actionKey));
      actionLabelsByApplicationId.set(log.applicationId, labels);
    }

    const emailLog =
      await this.emailService.sendQualityCampaignSponsorReportEmail({
        recipientEmails: campaign.sponsorEmails,
        campaignName: campaign.name,
        targets: campaign.targets.map((target) => ({
          applicationId: target.applicationId,
          applicationLabel: target.application.label,
          iqAtStart: target.iqAtStart,
          iqCurrent: target.application.quality,
          completedActions:
            actionLabelsByApplicationId.get(target.applicationId) ?? [],
        })),
        averageIqAtStart: impact.averageIqAtStart,
        averageIqCurrent: impact.averageIqCurrent,
        averageDelta: impact.averageDelta,
      });

    // Notification in-app pour les sponsors correspondant à un compte User existant (canal
    // séparé de l'email, best-effort — cf. notifyApplicationActors). Un seul email combiné ayant
    // été envoyé à tous les sponsors, ils partagent le même emailLogId.
    const sponsorUsers = await this.prisma.user.findMany({
      where: emailIn(campaign.sponsorEmails),
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

    // #2381 : la casse des emails d'acteurs peut différer de celle des comptes utilisateur.
    // On déduplique et on croise en insensible à la casse pour ne pas ignorer un opt-out.
    const recipientEmails = [
      ...new Map(
        actors
          .map((actor) => actor.email)
          .filter((email): email is string => Boolean(email))
          .map((email) => [email.toLowerCase(), email] as const),
      ).values(),
    ];
    if (recipientEmails.length === 0) return;

    // Notification in-app créée pour tout utilisateur correspondant, indépendamment de sa
    // préférence email (canal séparé) — même logique que application-validation-cron.service.ts.
    // `in` est sensible à la casse en base : on requête via des `equals` insensibles.
    const recipientUsers = await this.prisma.user.findMany({
      where: {
        OR: recipientEmails.map((email) => ({
          email: { equals: email, mode: "insensitive" as const },
        })),
      },
      select: { id: true, email: true, emailNotificationsEnabled: true },
    });

    const optedOutEmails = new Set(
      recipientUsers
        .filter((user) => user.emailNotificationsEnabled === false)
        .map((user) => user.email.toLowerCase()),
    );
    const eligibleEmails = recipientEmails.filter(
      (email) => !optedOutEmails.has(email.toLowerCase()),
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
          emailLogIdByEmail.set(recipientEmail.toLowerCase(), emailLog.id);
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
            emailLogId: emailLogIdByEmail.get(user.email.toLowerCase()),
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
      status: campaign.status,
      ...impact,
    };
  }

  /**
   * `targets` n'est résolu (et figé) qu'à l'envoi — nécessaire pour capturer un `iqAtStart`
   * fiable (#2282). Tant que la campagne n'a pas été envoyée, `targetCount` refléterait donc 0
   * application, ce qui est trompeur : l'admin doit voir immédiatement ce que son filtre cible.
   * On calcule alors un compte LIVE (même recherche que l'aperçu de création) en remplacement.
   */
  private async toDtoWithLiveTargetCount(
    campaign: QualityCampaignWithTargets,
    requestor: Requestor,
  ): Promise<QualityCampaignDto> {
    const dto = this.toDto(campaign);
    if (!campaign.sentAt) {
      const { total } = await this.searchTargets(campaign, requestor);
      dto.targetCount = total;
    }
    return dto;
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
