import { registerAs } from "@nestjs/config";

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Configuration du moteur de détection des corrélations (#2281).
 *
 * - `cronEnabled` : active le job planifié de détection (CORRELATION_CRON_ENABLED)
 * - `scoreThreshold` : score pondéré minimal pour créer une suggestion
 * - `weights` : pondération de chaque signal (similarité de nom, données
 *   partagées, acteurs communs)
 */
export const correlationConfig = registerAs("correlation", () => ({
  cronEnabled: process.env.CORRELATION_CRON_ENABLED === "true",
  scoreThreshold: parseNumber(process.env.CORRELATION_SCORE_THRESHOLD, 0.6),
  weights: {
    nameSimilarity: parseNumber(process.env.CORRELATION_WEIGHT_NAME, 0.5),
    sharedData: parseNumber(process.env.CORRELATION_WEIGHT_DATA, 0.3),
    sharedActors: parseNumber(process.env.CORRELATION_WEIGHT_ACTORS, 0.2),
  },
}));

export type CorrelationConfig = ReturnType<typeof correlationConfig>;
