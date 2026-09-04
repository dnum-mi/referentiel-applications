import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotificationType } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { NotificationService } from "src/notification/notification.service";
import {
  ACTIVE_APPLICATION_WHERE,
  computeEolStatus,
  eolStatusWhere,
  type EolStatus,
} from "./utils/eol-status";

/** Préfixe des entrées de `NotificationLog` propres aux fins de vie. */
const LOG_PREFIX = "technology_eol";

const STATUS_SENTENCE: Record<EolStatus, string> = {
  eol: "est en fin de vie",
  "eol-soon": "arrive en fin de vie dans moins de 6 mois",
  "eoas-passed": "n'est plus couverte par le support actif",
};

export interface EolNotificationResult {
  /** Technologies ayant atteint un statut pour lequel personne n'avait encore été prévenu. */
  newlyConcerned: number;
  /** Applications ayant donné lieu à au moins une notification. */
  applications: number;
  /** Notifications in-app créées (une par destinataire et par application). */
  notified: number;
}

/**
 * Alerte les gestionnaires quand une technologie de leur application entre en fin de vie (#2236).
 *
 * Séparé du rafraîchissement à dessein : un statut change aussi par simple **écoulement du temps**,
 * sans que la ligne soit périmée ni réécrite. Adosser l'alerte aux seules lignes rafraîchies
 * laisserait passer le cas le plus courant — une échéance connue de longue date qui arrive à terme.
 *
 * L'anti-répétition passe par `NotificationLog`, une entrée par technologie ET par statut : chaque
 * ligne de stack ne déclenche donc qu'une alerte par palier franchi, jamais une par exécution.
 *
 * Désactivé par défaut (`TECHNOLOGY_EOL_NOTIFY_ENABLED`) : le recalcul est une opération interne,
 * prévenir des utilisateurs est visible — les deux méritent des interrupteurs distincts.
 */
@Injectable()
export class EolNotificationService {
  private readonly logger = new Logger(EolNotificationService.name);
  private readonly notifyEnabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
  ) {
    this.notifyEnabled = this.configService.get<boolean>(
      "technology.eolNotifyEnabled",
      false,
    );
  }

  async notifyPendingEndOfLife(): Promise<EolNotificationResult | null> {
    if (!this.notifyEnabled) {
      this.logger.log(
        "Notifications de fin de vie désactivées (TECHNOLOGY_EOL_NOTIFY_ENABLED) : aucune alerte émise.",
      );
      return null;
    }

    const now = new Date();
    const rows = await this.prisma.technologyStack.findMany({
      // #2515 : les gestionnaires d'une application supprimée ne reçoivent plus d'alerte.
      where: {
        ...eolStatusWhere(undefined, now),
        application: ACTIVE_APPLICATION_WHERE,
      },
      select: {
        id: true,
        applicationId: true,
        product: true,
        version: true,
        eolDate: true,
        eoasDate: true,
      },
    });

    const concerned = rows
      .map((row) => ({ row, status: computeEolStatus(row, now) }))
      .filter(
        (entry): entry is { row: (typeof rows)[number]; status: EolStatus } =>
          entry.status !== null,
      );
    if (concerned.length === 0) {
      return { newlyConcerned: 0, applications: 0, notified: 0 };
    }

    // Un seul aller-retour pour savoir ce qui a déjà été annoncé, plutôt qu'une
    // requête par technologie.
    const alreadyLogged = new Set(
      (
        await this.prisma.notificationLog.findMany({
          where: {
            type: { startsWith: `${LOG_PREFIX}:` },
            applicationId: {
              in: [
                ...new Set(concerned.map((entry) => entry.row.applicationId)),
              ],
            },
          },
          select: { type: true },
        })
      ).map((log) => log.type),
    );

    const fresh = concerned.filter(
      (entry) => !alreadyLogged.has(this.logKey(entry.row.id, entry.status)),
    );
    if (fresh.length === 0) {
      return { newlyConcerned: 0, applications: 0, notified: 0 };
    }

    // Regroupées par application : cinq technologies périmées le même jour valent
    // un message qui les liste, pas cinq notifications dans la cloche.
    const byApplication = new Map<string, typeof fresh>();
    for (const entry of fresh) {
      const bucket = byApplication.get(entry.row.applicationId) ?? [];
      bucket.push(entry);
      byApplication.set(entry.row.applicationId, bucket);
    }

    let notified = 0;
    for (const [applicationId, entries] of byApplication) {
      const userIds =
        await this.notificationService.findUsersToNotifyForTechnology(
          applicationId,
        );
      if (userIds.length > 0) {
        await this.notificationService.createForUsers(
          userIds,
          NotificationType.technology_end_of_life,
          this.buildMessage(entries),
          {
            applicationId,
            link: `/applications/${applicationId}/tab-technologies`,
          },
        );
        notified += userIds.length;
      }

      // Journalisé même sans destinataire : sans cela, une application sans acteur
      // porteur de `TechnologyWrite` serait réexaminée à chaque exécution, et
      // deviendrait bruyante le jour où un acteur lui est enfin rattaché.
      await this.prisma.notificationLog.createMany({
        data: entries.map((entry) => ({
          applicationId,
          type: this.logKey(entry.row.id, entry.status),
        })),
        skipDuplicates: true,
      });
    }

    const result = {
      newlyConcerned: fresh.length,
      applications: byApplication.size,
      notified,
    };
    this.logger.log(
      `Fins de vie : ${result.newlyConcerned} technologie(s) nouvellement concernée(s) sur ` +
        `${result.applications} application(s), ${result.notified} notification(s) créée(s).`,
    );
    return result;
  }

  private logKey(technologyStackId: string, status: EolStatus): string {
    return `${LOG_PREFIX}:${technologyStackId}:${status}`;
  }

  private buildMessage(
    entries: {
      row: { product: string; version: string | null };
      status: EolStatus;
    }[],
  ): string {
    const parts = entries.map((entry) => {
      const name = entry.row.version
        ? `${entry.row.product} ${entry.row.version}`
        : entry.row.product;
      return `${name} ${STATUS_SENTENCE[entry.status]}`;
    });
    return parts.length === 1
      ? `${parts[0]}.`
      : `${parts.length} technologies à surveiller : ${parts.join(" ; ")}.`;
  }
}
