import { ServiceUnavailableException } from "@nestjs/common";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

/// Clés d'API Grist chiffrées en base (AES-256-GCM). Le secret vient de GRIST_ENCRYPTION_KEY,
/// ramené à 32 octets par SHA-256 : n'importe quelle chaîne longue et aléatoire convient.
/// Format stocké : v1:<iv>:<tag>:<chiffré>, en base64.
const VERSION = "v1";

function key(): Buffer {
  const secret = process.env.GRIST_ENCRYPTION_KEY?.trim();
  if (!secret) {
    throw new ServiceUnavailableException(
      "Synchronisation Grist indisponible : GRIST_ENCRYPTION_KEY n'est pas configurée.",
    );
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptGristApiKey(apiKey: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([
    cipher.update(apiKey, "utf8"),
    cipher.final(),
  ]);
  return [VERSION, iv, cipher.getAuthTag(), encrypted]
    .map((part) => (typeof part === "string" ? part : part.toString("base64")))
    .join(":");
}

/// null si la valeur n'est pas lisible : enregistrée en clair, ou chiffrée avec un autre secret.
export function decryptGristApiKey(stored: string): string | null {
  const [version, iv, tag, encrypted] = stored.split(":");
  if (version !== VERSION || !iv || !tag || !encrypted) return null;
  const secret = key();
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      secret,
      Buffer.from(iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(encrypted, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}
