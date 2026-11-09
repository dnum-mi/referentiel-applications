/** Résolution après chargement de ConfigModule (.env), avant tout upload en mémoire. */
function positiveLimit(name: string, fallback: number) {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(name + " doit être un entier positif.");
  }
  return value;
}

export const SBOM_LIMITS = {
  get maxBytes() {
    return positiveLimit("SBOM_MAX_BYTES", 20 * 1024 * 1024);
  },
  get maxComponents() {
    return positiveLimit("SBOM_MAX_COMPONENTS", 50_000);
  },
  get maxRelations() {
    return positiveLimit("SBOM_MAX_RELATIONS", 200_000);
  },
};
