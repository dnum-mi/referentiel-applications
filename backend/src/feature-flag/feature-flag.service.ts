import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { FeatureFlagDto, UpdateFeatureFlagDto } from "./dto/feature-flag.dto";
import { syncFeatureFlagCatalog } from "./feature-flag.sync";

/** Projection Prisma alignée sur `FeatureFlagDto` (l'audit `updatedById` reste interne). */
const FLAG_DTO_SELECT = {
  key: true,
  label: true,
  description: true,
  enabled: true,
  updatedAt: true,
} as const;

/**
 * Source de vérité runtime des feature flags.
 *
 * `isEnabled` est appelé très souvent (notamment par `FeatureFlagGuard` sur
 * chaque requête d'un endpoint gaté). On maintient donc un cache mémoire à TTL
 * court, invalidé immédiatement à chaque `update` pour qu'une bascule via
 * l'admin soit reflétée sans redémarrage.
 *
 * Limites assumées du cache :
 * - l'invalidation est locale à l'instance : en multi-replicas, une bascule se
 *   propage aux autres instances au plus tard après `CACHE_TTL_MS` ;
 * - en cas de panne DB, on sert le dernier état connu (stale-while-error) — ou
 *   « tout désactivé » si aucun état n'a jamais été chargé (fail-closed) — pour
 *   que `GET /config` (vital au boot du front) et les gardes ne tombent pas en 500.
 */
@Injectable()
export class FeatureFlagService implements OnModuleInit {
  /** Durée de vie du cache des états de flags (ms) — surchargée par l'env pour les tests. */
  private static readonly CACHE_TTL_MS = 10_000;
  /** Réarmement court après une erreur DB : on retente vite sans marteler la base. */
  private static readonly ERROR_RETRY_MS = 2_000;

  private readonly logger = new Logger(FeatureFlagService.name);
  private readonly ttlMs = Number(
    process.env.FEATURE_FLAG_CACHE_TTL_MS ?? FeatureFlagService.CACHE_TTL_MS,
  );

  private cache = new Map<string, boolean>();
  private cacheExpiresAt = 0;
  // Version incrémentée à chaque invalidation : un rechargement parti AVANT une
  // bascule ne peut pas écraser le cache avec des données déjà périmées.
  private cacheVersion = 0;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Aligne la table sur le catalogue au démarrage : c'est ce qui fait apparaître
   * un nouveau flag dans TOUS les environnements (en prod, le seed ne tourne
   * jamais). Best-effort : un échec est loggé mais n'empêche pas le boot (les
   * flags déjà en base restent servis).
   */
  async onModuleInit(): Promise<void> {
    try {
      await syncFeatureFlagCatalog(this.prisma);
    } catch (error) {
      this.logger.error(
        "Synchronisation du catalogue de feature flags impossible au démarrage",
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  findAll(): Promise<FeatureFlagDto[]> {
    return this.prisma.featureFlag.findMany({
      select: FLAG_DTO_SELECT,
      orderBy: { key: "asc" },
    });
  }

  async update(
    key: string,
    dto: UpdateFeatureFlagDto,
    userId?: string,
  ): Promise<FeatureFlagDto> {
    try {
      const flag = await this.prisma.featureFlag.update({
        where: { key },
        data: { enabled: dto.enabled, updatedById: userId ?? null },
        select: FLAG_DTO_SELECT,
      });
      this.invalidateCache();
      return flag;
    } catch (error) {
      // P2025 : la ligne n'existe pas — une seule requête, atomique.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new NotFoundException(`Feature flag « ${key} » introuvable.`);
      }
      throw error;
    }
  }

  /** État d'un flag, résolu via le cache (défaut : désactivé si inconnu). */
  async isEnabled(key: string): Promise<boolean> {
    const cache = await this.getCache();
    return cache.get(key) ?? false;
  }

  /**
   * Map clé → état exposée au front via `GET /config` (public) : seuls les flags
   * ACTIVÉS sont listés — le front traite déjà toute clé absente comme
   * désactivée, et on ne divulgue pas l'existence des fonctionnalités coupées.
   */
  async getEnabledMap(): Promise<Record<string, boolean>> {
    const cache = await this.getCache();
    return Object.fromEntries(
      [...cache.entries()].filter(([, enabled]) => enabled),
    );
  }

  private async getCache(): Promise<Map<string, boolean>> {
    if (Date.now() < this.cacheExpiresAt) {
      return this.cache;
    }
    const versionAtLoad = this.cacheVersion;
    try {
      const flags = await this.prisma.featureFlag.findMany({
        select: { key: true, enabled: true },
      });
      // Une invalidation (bascule) survenue pendant le findMany rend ce
      // résultat potentiellement périmé : on ne l'installe pas.
      if (this.cacheVersion === versionAtLoad) {
        this.cache = new Map(flags.map((f) => [f.key, f.enabled]));
        this.cacheExpiresAt = Date.now() + this.ttlMs;
      }
    } catch (error) {
      this.logger.error(
        "Lecture des feature flags impossible — état stale servi",
        error instanceof Error ? error.stack : String(error),
      );
      this.cacheExpiresAt = Date.now() + FeatureFlagService.ERROR_RETRY_MS;
    }
    return this.cache;
  }

  private invalidateCache(): void {
    this.cacheVersion += 1;
    this.cacheExpiresAt = 0;
  }
}
