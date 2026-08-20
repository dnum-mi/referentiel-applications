import { Logger } from "@nestjs/common";
import { registerAs } from "@nestjs/config";

const logger = new Logger("CorrelationConfig");

/**
 * Lit un ratio de configuration, borné à [0, 1].
 *
 * `Number.parseFloat("0,6")` vaut 0 : une virgule décimale — réflexe naturel
 * en français — donnerait donc un seuil nul, et toutes les paires
 * deviendraient des suggestions. Toute valeur hors bornes retombe sur le
 * défaut, en le signalant plutôt qu'en s'exécutant silencieusement de travers.
 */
function parseRatio(
  name: string,
  value: string | undefined,
  fallback: number,
): number {
  if (value === undefined || value === "") return fallback;
  // `Number` et non `parseFloat` : ce dernier s'arrête au premier caractère
  // invalide, donc "0,6" vaudrait 0 — une valeur en apparence légitime.
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    logger.warn(
      `${name}="${value}" ignoré : un ratio entre 0 et 1 est attendu (point décimal). Valeur retenue : ${fallback}.`,
    );
    return fallback;
  }
  return parsed;
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
  scoreThreshold: parseRatio(
    "CORRELATION_SCORE_THRESHOLD",
    process.env.CORRELATION_SCORE_THRESHOLD,
    0.6,
  ),
  weights: {
    nameSimilarity: parseRatio(
      "CORRELATION_WEIGHT_NAME",
      process.env.CORRELATION_WEIGHT_NAME,
      0.5,
    ),
    sharedData: parseRatio(
      "CORRELATION_WEIGHT_DATA",
      process.env.CORRELATION_WEIGHT_DATA,
      0.3,
    ),
    sharedActors: parseRatio(
      "CORRELATION_WEIGHT_ACTORS",
      process.env.CORRELATION_WEIGHT_ACTORS,
      0.2,
    ),
  },
}));

export type CorrelationConfig = ReturnType<typeof correlationConfig>;
