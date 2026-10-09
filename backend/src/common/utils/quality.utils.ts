import type { PrismaService } from "src/prisma/prisma.service";
import type { QualitySummaryDto } from "src/applications/dto/get-application.dto";
import {
  isDimaFilled,
  isPdmaFilled,
} from "src/common/utils/compliance-presence.utils";

/**
 * Charge les éléments de qualité d'une application. Source unique des requêtes partagées
 * par le résumé qualité et le calcul de l'IQ (B22).
 */
export async function getQualitySummary(
  applicationId: string,
  prisma: PrismaService,
): Promise<QualitySummaryDto> {
  const [application, hosting, actors, compliance, links, rgaaCompliances] =
    await Promise.all([
      prisma.application.findUnique({ where: { id: applicationId } }),
      prisma.hosting.findFirst({ where: { applicationId } }),
      prisma.actor.findMany({
        where: { applicationId },
        include: { actorType: true },
      }),
      prisma.compliance.findFirst({ where: { applicationId } }),
      prisma.externalRessource.findMany({ where: { applicationId } }),
      prisma.rgaaCompliance.findMany({ where: { applicationId } }),
    ]);

  return {
    hasDescription: Boolean(application?.description),
    hasHosting: Boolean(hosting),
    hasSnapvisu: links.some((l) => l.link.toLowerCase().includes("snapvisu")),
    actors: {
      MOA: actors.some((a) => a.actorType?.code === "MOA"),
      MOE: actors.some((a) => a.actorType?.code === "MOE"),
      TMA: actors.some((a) => a.actorType?.code === "TMA"),
      HEB: actors.some((a) => a.actorType?.code === "HEB"),
      REP: actors.some((a) => a.actorType?.code === "REP"),
    },
    compliances: {
      DIMA: isDimaFilled(compliance),
      PDMA: isPdmaFilled(compliance),
      HOMOLOGATION: Boolean(compliance?.homologation_date_end),
      RGAA: rgaaCompliances.length > 0,
      DSFR: compliance?.dsfr_implemented ?? null,
      RGPD: compliance?.rgpd_has_aipd ?? null,
    },
  };
}

export async function calculateIQ(
  applicationId: string,
  prisma: PrismaService,
): Promise<number> {
  return calculateIQFromSummary(await getQualitySummary(applicationId, prisma));
}

export function calculateIQFromSummary(summary: QualitySummaryDto): number {
  const { actors, compliances } = summary;
  const rules = [
    { value: summary.hasDescription, importance: 1 },
    { value: summary.hasHosting, importance: 1 },
    { value: actors.MOA, importance: 1 },
    { value: actors.MOE, importance: 2 },
    { value: actors.TMA, importance: 2 },
    { value: actors.HEB, importance: 3 },
    { value: actors.REP, importance: 3 },
    { value: compliances.PDMA, importance: 3 },
    { value: compliances.DIMA, importance: 3 },
    { value: compliances.HOMOLOGATION, importance: 3 },
    { value: summary.hasSnapvisu, importance: 3 },
  ];

  const noCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0 };

  rules.forEach((c) => {
    if (!c.value) noCounts[c.importance]++;
  });

  const positions = {
    1: [50, 5, 3, 0, 0],
    2: [30, 5, 0, 0, 0],
    3: [20, 15, 10, 5, 1],
  };

  const score1 = noCounts[1] > 4 ? 0 : positions[1][noCounts[1]];
  const score2 = noCounts[2] > 4 ? 0 : positions[2][noCounts[2]];
  const score3 = noCounts[3] > 4 ? 0 : positions[3][noCounts[3]];

  return score1 + score2 + score3;
}
