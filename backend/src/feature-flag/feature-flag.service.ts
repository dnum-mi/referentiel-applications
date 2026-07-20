import { Injectable, NotFoundException } from "@nestjs/common";
import { FeatureFlag } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { UpdateFeatureFlagDto } from "./dto/feature-flag.dto";

/**
 * Source de vérité runtime des feature flags.
 *
 * `isEnabled` est appelé très souvent (notamment par `FeatureFlagGuard` sur
 * chaque requête d'un endpoint gaté). On maintient donc un cache mémoire à TTL
 * court, invalidé immédiatement à chaque `update` pour qu'une bascule via
 * l'admin soit reflétée sans redémarrage.
 */
@Injectable()
export class FeatureFlagService {
  /** Durée de vie du cache des états de flags (ms). */
  private static readonly CACHE_TTL_MS = 10_000;

  private cache = new Map<string, boolean>();
  private cacheExpiresAt = 0;

  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<FeatureFlag[]> {
    return this.prisma.featureFlag.findMany({ orderBy: { key: "asc" } });
  }

  async update(
    key: string,
    dto: UpdateFeatureFlagDto,
    userId?: string,
  ): Promise<FeatureFlag> {
    const existing = await this.prisma.featureFlag.findUnique({
      where: { key },
    });
    if (!existing) {
      throw new NotFoundException(`Feature flag « ${key} » introuvable.`);
    }
    const flag = await this.prisma.featureFlag.update({
      where: { key },
      data: { enabled: dto.enabled, updatedById: userId ?? null },
    });
    this.invalidateCache();
    return flag;
  }

  /** État d'un flag, résolu via le cache (défaut : désactivé si inconnu). */
  async isEnabled(key: string): Promise<boolean> {
    const cache = await this.getCache();
    return cache.get(key) ?? false;
  }

  /** Map clé → état de tous les flags, telle qu'exposée au front via /config. */
  async getEnabledMap(): Promise<Record<string, boolean>> {
    const cache = await this.getCache();
    return Object.fromEntries(cache);
  }

  private async getCache(): Promise<Map<string, boolean>> {
    if (Date.now() < this.cacheExpiresAt) {
      return this.cache;
    }
    const flags = await this.prisma.featureFlag.findMany({
      select: { key: true, enabled: true },
    });
    this.cache = new Map(flags.map((f) => [f.key, f.enabled]));
    this.cacheExpiresAt = Date.now() + FeatureFlagService.CACHE_TTL_MS;
    return this.cache;
  }

  private invalidateCache(): void {
    this.cacheExpiresAt = 0;
  }
}
