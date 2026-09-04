import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
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
 * L'anti-répétition passe par `NotificationLog`, une entrée par technologie, par statut ET par
 * échéance (#2518) : chaque ligne de stack ne déclenche qu'une alerte par palier franchi, jamais
 * une par exécution — mais une ligne montée de version, ou dont la date manuelle est ressaisie,
 * porte une nouvelle échéance et sera de nouveau annoncée quand elle franchira un palier.
 *
 * Désactivé par défaut (`TECHNOLOGY_EOL_NOTIFY_ENABLED`) : le recalcul est une opération interne,
 * prévenir des utilisateurs est visible — les deux méritent des interrupteurs distincts. Les
 * alertes ont leur propre planification (#2519) : elles ne dépendent ni du cron de recalcul ni
 * d'`ENDOFLIFE_ENABLED`, sans quoi les saisies manuelles n'étaient jamais alertées dès que l'un
 * des deux était coupé.
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

  /**
   * Après le recalcul planifié (3 h), pour porter sur les dates du jour ; avant la détection des
   * corrélations (4 h). Un recalcul qui déborderait ferait porter les alertes sur les dates de la
   * veille — un statut qui change par simple écoulement du temps est de toute façon détecté.
   */
  @Cron("30 3 * * *", { timeZone: "Europe/Paris" })
  async handleScheduledNotifications(): Promise<void> {
    await this.notifyPendingEndOfLife().catch((error) => {
      this.logger.error(
        "Échec des notifications de fin de vie",
        error instanceof Error ? error.stack : String(error),
      );
    });
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

    // Les entrées antérieures à #2518 (clé sans échéance) restent reconnues : sans cela, tout le
    // parc déjà annoncé serait réalerté d'un coup au déploiement.
    const fresh = concerned.filter(
      (entry) =>
        !alreadyLogged.has(this.logKey(entry.row, entry.status)) &&
        !alreadyLogged.has(this.legacyLogKey(entry.row.id, entry.status)),
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
    let newlyConcerned = 0;
    let applications = 0;
    for (const [applicationId, entries] of byApplication) {
      const userIds =
        await this.notificationService.findUsersToNotifyForTechnology(
          applicationId,
        );
      if (userIds.length > 0) {
        try {
          await this.notificationService.createForUsers(
            userIds,
            NotificationType.technology_end_of_life,
            this.buildMessage(entries),
            {
              applicationId,
              link: `/applications/${applicationId}/tab-technologies`,
            },
          );
        } catch (error) {
          // #2518 : pas de journal sans notification — la ligne sera retentée à la
          // prochaine exécution au lieu d'être tenue pour annoncée.
          this.logger.error(
            `Échec de la création des notifications de fin de vie pour l'application ${applicationId} : réexaminée à la prochaine exécution`,
            error instanceof Error ? error.stack : String(error),
          );
          continue;
        }
        notified += userIds.length;
      }

      // Journalisé APRÈS le succès, et même sans destinataire : sans cela, une
      // application sans acteur porteur de `TechnologyWrite` serait réexaminée à
      // chaque exécution, et deviendrait bruyante le jour où un acteur lui est
      // enfin rattaché.
      await this.prisma.notificationLog.createMany({
        data: entries.map((entry) => ({
          applicationId,
          type: this.logKey(entry.row, entry.status),
        })),
        skipDuplicates: true,
      });
      newlyConcerned += entries.length;
      applications += 1;
    }

    const result = { newlyConcerned, applications, notified };
    this.logger.log(
      `Fins de vie : ${result.newlyConcerned} technologie(s) nouvellement concernée(s) sur ` +
        `${result.applications} application(s), ${result.notified} notification(s) créée(s).`,
    );
    return result;
  }

  /**
   * Clé d'anti-répétition : technologie + statut + échéance qui fonde ce statut (#2518). Une
   * échéance différente (montée de version, date manuelle ressaisie) = une nouvelle alerte due.
   */
  private logKey(
    row: { id: string; eolDate: Date | null; eoasDate: Date | null },
    status: EolStatus,
  ): string {
    const deadline = status === "eoas-passed" ? row.eoasDate : row.eolDate;
    const dateKey = deadline ? deadline.toISOString().slice(0, 10) : "none";
    return `${this.legacyLogKey(row.id, status)}:${dateKey}`;
  }

  /** Forme des clés antérieures à #2518, sans échéance. */
  private legacyLogKey(technologyStackId: string, status: EolStatus): string {
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
