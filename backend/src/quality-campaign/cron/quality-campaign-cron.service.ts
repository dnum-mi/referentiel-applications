import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "src/prisma/prisma.service";
import { QualityCampaignService } from "../quality-campaign.service";

/**
 * Déclenche automatiquement l'envoi des campagnes de mise en qualité à leur date de début
 * (#2282). Cadence quotidienne (contrairement au cron mensuel de relance de validation) : la
 * date de début d'une campagne est une date libre choisie par l'admin, pas un jalon fixe.
 */
@Injectable()
export class QualityCampaignCronService implements OnApplicationBootstrap {
  private readonly logger = new Logger(QualityCampaignCronService.name);
  private readonly cronEnabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly qualityCampaignService: QualityCampaignService,
    private readonly configService: ConfigService,
  ) {
    this.cronEnabled = this.configService.get<boolean>(
      "email.cronEnabled",
      false,
    );
  }

  async onApplicationBootstrap() {
    if (!this.cronEnabled) {
      this.logger.log(
        "Envoi automatique des campagnes qualité désactivé (EMAIL_CRON_ENABLED) : vérification au démarrage ignorée.",
      );
      return;
    }
    await this.sendDueCampaigns();
  }

  @Cron("0 8 * * *", { timeZone: "Europe/Paris" })
  async handleDailyCron() {
    if (!this.cronEnabled) {
      this.logger.log(
        "Envoi automatique des campagnes qualité désactivé (EMAIL_CRON_ENABLED) : exécution quotidienne ignorée.",
      );
      return;
    }
    await this.sendDueCampaigns();
  }

  async sendDueCampaigns() {
    const dueCampaigns = await this.prisma.qualityCampaign.findMany({
      where: { startDate: { lte: new Date() }, sentAt: null },
      select: { id: true, name: true },
    });

    if (dueCampaigns.length === 0) return;

    this.logger.log(
      `Envoi automatique de ${dueCampaigns.length} campagne(s) qualité arrivées à échéance.`,
    );

    for (const campaign of dueCampaigns) {
      try {
        await this.qualityCampaignService.sendCampaign(campaign.id);
        this.logger.log(
          `Campagne qualité « ${campaign.name} » (${campaign.id}) envoyée.`,
        );
      } catch (error) {
        this.logger.error(
          `Échec d'envoi de la campagne qualité ${campaign.id}:`,
          error,
        );
      }
    }
  }
}
