import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { BaseService } from "src/common/base.service";
import { MetadatasService } from "src/metadatas/metadatas.service";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateTechnologyDto } from "./dto/technology.dto";
import { TechnologyStack } from "./entities/technology.entity";
import { ServiceOptions } from "src/common/utils/types";
import { ApplicationService } from "src/applications/application.service";
import {
  fetchProductCatalog,
  normalizeProductKey,
  parseEolInfo,
  resolveProductReleases,
  type EndoflifeProduct,
  type EolResolution,
} from "./utils/endoflife.utils";

// Au-delà de ce délai, on rafraîchit paresseusement la fin de vie au GET.
const EOL_REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

@Injectable()
export class TechnologyService extends BaseService<TechnologyStack> {
  constructor(
    readonly prisma: PrismaService,
    metadataService: MetadatasService,
    applicationService: ApplicationService,
  ) {
    super(prisma.technologyStack, prisma, metadataService, applicationService);
  }

  // Appels réseau endoflife.date désactivés en test et via ENDOFLIFE_ENABLED=false,
  // pour éviter tout appel non déterministe.
  private eolDisabled(): boolean {
    return (
      process.env.NODE_ENV === "test" ||
      process.env.ENDOFLIFE_ENABLED === "false"
    );
  }

  // Traduit une résolution endoflife en champs à persister. Trois cas :
  // - « unavailable » (réseau/API en échec) → AUCUN champ : la valeur existante n'est
  //   ni écrasée ni son TTL réarmé (retentée au prochain GET) ;
  // - « unknown-product » → eolProduct null + eolCheckedAt : le front peut signaler
  //   « produit non suivi par endoflife.date » (distinct d'un produit sans EOL publiée) ;
  // - « resolved » → slug + dates EOL/fin de support actif + dernière version du cycle.
  private eolFieldsFrom(
    resolution: EolResolution,
    version?: string | null,
  ): {
    eolProduct?: string | null;
    eolDate?: Date | null;
    eoasDate?: Date | null;
    latestVersion?: string | null;
    eolCheckedAt?: Date | null;
  } {
    if (resolution.status === "unavailable") return {};
    const eolCheckedAt = new Date();
    if (resolution.status === "unknown-product") {
      return {
        eolProduct: null,
        eolDate: null,
        eoasDate: null,
        latestVersion: null,
        eolCheckedAt,
      };
    }
    return {
      eolProduct: resolution.slug,
      ...parseEolInfo(resolution.releases, version ?? ""),
      eolCheckedAt,
    };
  }

  // Résout la fin de vie à partir du PRODUIT (et de la version, optionnelle : sans
  // version on résout quand même le produit pour détecter les produits non suivis).
  private async resolveEol(
    product: string,
    version?: string | null,
  ): Promise<ReturnType<TechnologyService["eolFieldsFrom"]>> {
    if (this.eolDisabled() || !product?.trim()) return {};
    return this.eolFieldsFrom(await resolveProductReleases(product), version);
  }

  // Catalogue des produits suivis par endoflife.date (autocomplétion côté front).
  // Best-effort : liste vide si le catalogue n'a jamais pu être récupéré (le front
  // retombe alors sur la saisie libre).
  async listEolProducts(): Promise<EndoflifeProduct[]> {
    if (this.eolDisabled()) return [];
    return (await fetchProductCatalog()) ?? [];
  }

  async findAllByApplicationId(
    applicationId: string,
  ): Promise<TechnologyStack[]> {
    const rows = (await this.prisma.technologyStack.findMany({
      where: { applicationId },
      orderBy: [{ technology: "asc" }, { product: "asc" }],
    })) as unknown as TechnologyStack[];

    if (this.eolDisabled()) return rows;

    // Rafraîchissement paresseux best-effort des lignes dont la fin de vie n'a jamais
    // été calculée ou dépasse le TTL. La résolution d'un produit n'est faite qu'UNE
    // fois par requête (mémoïsation par clé produit) puis appliquée à chaque version.
    const now = Date.now();
    const resolutionsByKey = new Map<string, Promise<EolResolution>>();
    const getResolution = (product: string) => {
      const key = normalizeProductKey(product);
      let pending = resolutionsByKey.get(key);
      if (!pending) {
        pending = resolveProductReleases(product);
        resolutionsByKey.set(key, pending);
      }
      return pending;
    };

    return Promise.all(
      rows.map(async (row) => {
        const stale =
          !row.eolCheckedAt ||
          now - new Date(row.eolCheckedAt).getTime() > EOL_REFRESH_TTL_MS;
        if (!stale) return row;

        const fields = this.eolFieldsFrom(
          await getResolution(row.product),
          row.version,
        );
        // Échec réseau/HTTP : on NE réécrit PAS — sinon on écraserait une date valide par
        // null et on figerait la ligne pour tout le TTL. On la laisse « périmée » : elle
        // sera retentée au prochain GET dès qu'endoflife.date répond de nouveau.
        if (!fields.eolCheckedAt) return row;
        // Persistance best-effort : un échec d'écriture ne doit pas casser la lecture.
        await this.prisma.technologyStack
          .update({ where: { id: row.id }, data: fields })
          .catch(() => undefined);
        return { ...row, ...fields };
      }),
    );
  }

  async createTechnology(
    applicationId: string,
    dto: CreateTechnologyDto,
    options?: ServiceOptions<TechnologyStack>,
  ): Promise<TechnologyStack> {
    const applicationExists = await this.prisma.application.findUnique({
      where: { id: applicationId },
      select: { id: true },
    });
    if (!applicationExists) {
      throw new NotFoundException(
        "Application introuvable pour cet identifiant",
      );
    }

    const existing = await this.prisma.technologyStack.findUnique({
      where: {
        applicationId_technology_product: {
          applicationId,
          technology: dto.technology,
          product: dto.product,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        "Ce produit est déjà renseigné pour cette technologie et cette application",
      );
    }

    const eol = await this.resolveEol(dto.product, dto.version);
    return super.create({ ...dto, ...eol, applicationId }, options);
  }

  async updateTechnology(
    id: string,
    applicationId: string,
    dto: Partial<CreateTechnologyDto>,
    options?: ServiceOptions<TechnologyStack>,
  ): Promise<TechnologyStack> {
    const existing = await this.prisma.technologyStack.findUnique({
      where: { id },
    });
    if (existing?.applicationId !== applicationId) {
      throw new NotFoundException("Technologie introuvable");
    }

    const newTechnology = dto.technology ?? existing.technology;
    const newProduct = dto.product ?? existing.product;
    const pairChanged =
      newTechnology !== existing.technology || newProduct !== existing.product;
    if (pairChanged) {
      const conflict = await this.prisma.technologyStack.findUnique({
        where: {
          applicationId_technology_product: {
            applicationId,
            technology: newTechnology,
            product: newProduct,
          },
        },
      });
      if (conflict && conflict.id !== id) {
        throw new ConflictException(
          "Ce produit est déjà renseigné pour cette technologie et cette application",
        );
      }
    }

    // Recalcule la fin de vie si le produit ou la version change.
    const eolInputChanged =
      dto.product !== undefined || dto.version !== undefined;
    const eol = eolInputChanged
      ? await this.resolveEol(newProduct, dto.version ?? existing.version)
      : {};

    return super.update(id, { ...dto, ...eol }, options);
  }

  async deleteTechnology(
    id: string,
    applicationId: string,
    options?: ServiceOptions<TechnologyStack>,
  ): Promise<void> {
    const existing = await this.prisma.technologyStack.findUnique({
      where: { id },
    });
    if (existing?.applicationId !== applicationId) {
      throw new NotFoundException("Technologie introuvable");
    }
    await super.delete(id, options);
  }
}
