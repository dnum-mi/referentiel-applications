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

// GRIST_API_KEY est un secret : elle ne sort jamais de ce module ni du client Grist.
export const gristConfig = registerAs("grist", () => ({
  url: process.env.GRIST_URL?.trim() || "https://grist.numerique.gouv.fr",
  apiKey: process.env.GRIST_API_KEY?.trim() || undefined,
  docId: process.env.GRIST_DOC_ID?.trim() || undefined,
  timeoutMs: getGristTimeoutMs(),
}));
