import { FEATURE_FLAG_CATALOG } from "./feature-flag.keys";

/**
 * Sous-ensemble structurel du délégué Prisma `featureFlag` : permet d'accepter
 * aussi bien le `PrismaClient` nu (seed) que le `PrismaService` étendu du
 * backend (`$extends` change le type nominal du client).
 */
interface FeatureFlagDelegate {
  featureFlag: {
    findMany(args: {
      select: { key: true; updatedById: true };
    }): Promise<{ key: string; updatedById: string | null }[]>;
    create(args: {
      data: {
        key: string;
        label: string;
        description: string | null;
        enabled: boolean;
      };
    }): Promise<unknown>;
    update(args: {
      where: { key: string };
      data: { label: string; description: string | null; enabled?: boolean };
    }): Promise<unknown>;
    deleteMany(args: { where: { key: { notIn: string[] } } }): Promise<unknown>;
  };
}

/** Journal minimal des changements appliqués par la synchronisation. */
export interface FeatureFlagSyncLogger {
  log(message: string): void;
}

/**
 * Synchronise la table `FeatureFlag` avec le catalogue (`FEATURE_FLAG_CATALOG`).
 *
 * Appelée au démarrage du backend (`FeatureFlagService.onModuleInit`) et par le
 * seed : c'est elle qui garantit qu'un flag ajouté au catalogue existe dans
 * TOUS les environnements — y compris la production, où le seed ne tourne
 * jamais (`start:prod` = `migrate deploy` seulement).
 *
 * Règles :
 * - flag absent → créé avec `enabled = defaultEnabled` (ou activé s'il figure
 *   dans `FEATURE_FLAGS_DEFAULTS`) ;
 * - flag présent → libellé/description réalignés sur le catalogue ; son état
 *   `enabled` n'est JAMAIS modifié, sauf pré-activation par
 *   `FEATURE_FLAGS_DEFAULTS` d'un flag qu'aucun admin n'a encore basculé
 *   (`updatedById` null) — la variable pré-active, elle ne désactive jamais et
 *   n'écrase jamais un choix humain ;
 * - flag en base absent du catalogue (retiré du code) → supprimé, pour que
 *   l'admin ne montre jamais un toggle sans aucun effet possible.
 */
export async function syncFeatureFlagCatalog(
  prisma: FeatureFlagDelegate,
  logger?: FeatureFlagSyncLogger,
): Promise<void> {
  const defaults = new Set(
    (process.env.FEATURE_FLAGS_DEFAULTS ?? "")
      .split(",")
      .map((key) => key.trim())
      .filter(Boolean),
  );
  const existing = await prisma.featureFlag.findMany({
    select: { key: true, updatedById: true },
  });
  const byKey = new Map(existing.map((flag) => [flag.key, flag]));
  const catalogKeys: string[] = FEATURE_FLAG_CATALOG.map((def) => def.key);

  for (const {
    key,
    label,
    description,
    defaultEnabled,
  } of FEATURE_FLAG_CATALOG) {
    const current = byKey.get(key);
    if (!current) {
      const enabled = defaultEnabled || defaults.has(key);
      await prisma.featureFlag.create({
        data: {
          key,
          label,
          description: description ?? null,
          enabled,
        },
      });
      logger?.log(`Feature flag « ${key} » créé (enabled=${enabled})`);
    } else {
      const preActivate = defaults.has(key) && current.updatedById === null;
      await prisma.featureFlag.update({
        where: { key },
        data: {
          label,
          description: description ?? null,
          ...(preActivate ? { enabled: true } : {}),
        },
      });
      if (preActivate) {
        logger?.log(
          `Feature flag « ${key} » pré-activé via FEATURE_FLAGS_DEFAULTS`,
        );
      }
    }
  }

  // Purge des orphelins : un flag retiré du catalogue disparaît de la base (et
  // donc de l'écran d'admin) au prochain démarrage.
  const orphans = existing.filter((flag) => !catalogKeys.includes(flag.key));
  if (orphans.length) {
    await prisma.featureFlag.deleteMany({
      where: { key: { notIn: [...catalogKeys] } },
    });
    logger?.log(
      `Feature flags retirés du catalogue supprimés : ${orphans
        .map((flag) => flag.key)
        .join(", ")}`,
    );
  }
}
