import { Logger } from "@nestjs/common";
import { registerAs } from "@nestjs/config";

const logger = new Logger("GristConfig");

export function getGristTimeoutMs(): number {
  const raw = process.env.GRIST_TIMEOUT_MS?.trim();
  if (!raw) return 30_000;
  const timeoutMs = Number(raw);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 300_000) {
    logger.warn(
      "GRIST_TIMEOUT_MS invalide : entier attendu entre 1 et 300000 ms. Valeur retenue : 30000 ms.",
    );
    return 30_000;
  }
  return timeoutMs;
}

// L'instance, la clé d'API et les documents sont propres à chaque utilisateur (profil).
// Les clés d'API sont chiffrées en base avec GRIST_ENCRYPTION_KEY (cf. grist-api-key.ts).
export const gristConfig = registerAs("grist", () => {
  if (!process.env.GRIST_ENCRYPTION_KEY?.trim()) {
    logger.warn(
      "GRIST_ENCRYPTION_KEY absente : la synchronisation Grist et l'enregistrement des clés d'API sont indisponibles.",
    );
  }
  return { timeoutMs: getGristTimeoutMs() };
});
