import { Logger } from "@nestjs/common";
import { registerAs } from "@nestjs/config";

const logger = new Logger("TechnologyConfig");

/**
 * Taille de lot du recalcul planifié, bornée à [1, 200].
 *
 * Le lot n'existe pas pour ménager la base — les écritures sont légères — mais
 * endoflife.date : chaque lot ne résout qu'une fois par produit distinct, et
 * séquencer les lots évite d'ouvrir des centaines de requêtes HTTP d'un coup
 * vers un service public gratuit.
 */
function parseBatchSize(value: string | undefined, fallback: number): number {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 200) {
    logger.warn(
      `TECHNOLOGY_EOL_BATCH_SIZE="${value}" ignoré : un entier entre 1 et 200 est attendu. Valeur retenue : ${fallback}.`,
    );
    return fallback;
  }
  return parsed;
}

/**
 * Configuration du suivi des fins de vie (#2236).
 *
 * - `eolCronEnabled` : active le recalcul global planifié (TECHNOLOGY_EOL_CRON_ENABLED)
 * - `eolNotifyEnabled` : active les alertes aux gestionnaires (TECHNOLOGY_EOL_NOTIFY_ENABLED)
 * - `eolBatchSize` : nombre de lignes de stack traitées par lot
 *
 * Les deux interrupteurs sont **désactivés par défaut** et volontairement
 * distincts : recalculer est une opération interne, prévenir des utilisateurs
 * est visible. On peut vouloir rafraîchir les données bien avant d'accepter
 * d'alerter qui que ce soit.
 */
export const technologyConfig = registerAs("technology", () => ({
  eolCronEnabled: process.env.TECHNOLOGY_EOL_CRON_ENABLED === "true",
  eolNotifyEnabled: process.env.TECHNOLOGY_EOL_NOTIFY_ENABLED === "true",
  eolBatchSize: parseBatchSize(process.env.TECHNOLOGY_EOL_BATCH_SIZE, 50),
}));

export type TechnologyConfig = ReturnType<typeof technologyConfig>;
