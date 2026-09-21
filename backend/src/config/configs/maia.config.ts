import { Logger } from "@nestjs/common";
import { registerAs } from "@nestjs/config";

const logger = new Logger("MaiaConfig");

export function getMaiaTimeoutMs(): number {
  const raw = process.env.MAIA_TIMEOUT_MS?.trim();
  if (!raw) return 5_000;
  const timeoutMs = Number(raw);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60_000) {
    logger.warn(
      "MAIA_TIMEOUT_MS invalide : entier attendu entre 1 et 60000 ms. Valeur retenue : 5000 ms.",
    );
    return 5_000;
  }
  return timeoutMs;
}

export const maiaConfig = registerAs("maia", () => ({
  timeoutMs: getMaiaTimeoutMs(),
}));
