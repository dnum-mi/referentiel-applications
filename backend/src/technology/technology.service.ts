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
  isEndoflifeDisabled,
  normalizeProductKey,
  parseEolInfo,
  resolveProductReleases,
  type EndoflifeProduct,
  type EolResolution,
} from "./utils/endoflife.utils";
import { EOL_REFRESH_TTL_MS } from "./utils/eol-status";

// Au-delà de ce délai, on rafraîchit paresseusement la fin de vie au GET.

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
  // pour éviter tout appel non déterministe (même interrupteur que le cron).
  private eolDisabled(): boolean {
    return isEndoflifeDisabled();
  }

  // Traduit une résolution endoflife en champs à persister. Trois cas :
  // - « unavailable » (réseau/API en échec) → AUCUN champ : la valeur existante n'est
  //   ni écrasée ni son TTL réarmé (retentée au prochain GET) ;
  // - « unknown-product » → eolProduct null + eolCheckedAt : le front peut signaler
  //   « produit non suivi par endoflife.date » (distinct d'un produit sans EOL publiée) ;
  // - « resolved » → slug + cycle apparié + dates EOL/fin de support actif + dernière
  //   version du cycle. Le cycle est persisté (#2449) : produit suivi mais cycle null =
  //   version non reconnue (« MySQL 8 »), à distinguer d'un cycle connu sans échéance
  //   publiée (Apache 2.4) — les dates nulles seules ne le disent pas.
  private eolFieldsFrom(
    resolution: EolResolution,
    version?: string | null,
  ): {
    eolProduct?: string | null;
    eolDate?: Date | null;
    eoasDate?: Date | null;
    latestVersion?: string | null;
    eolCycle?: string | null;
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
        eolCycle: null,
        eolCheckedAt,
      };
    }
    const { cycle, ...info } = parseEolInfo(resolution.releases, version ?? "");
    return {
      eolProduct: resolution.slug,
      ...info,
      eolCycle: cycle,
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

  // Recherche la ligne de stack existante pour ce couple technologie/produit,
  // sans tenir compte de la casse (« postgresql » ≡ « PostgreSQL »).
  private async findExistingEntry(
    applicationId: string,
    technology: string,
    product: string,
  ) {
    return this.prisma.technologyStack.findFirst({
      where: {
        applicationId,
        technology: { equals: technology, mode: "insensitive" },
        product: { equals: product, mode: "insensitive" },
      },
    });
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

    const existing = await this.findExistingEntry(
      applicationId,
      dto.technology,
      dto.product,
    );
    if (existing) {
      // Le couple technologie/produit est déjà renseigné (à la casse près) :
      // on met à jour la ligne existante au lieu de créer un doublon. La
      // graphie déjà enregistrée est conservée ; le formulaire soumis fait
      // foi pour la version et le lien documentaire.
      const eol = await this.resolveEol(existing.product, dto.version);
      return super.update(
        existing.id,
        { version: dto.version ?? null, docUrl: dto.docUrl ?? null, ...eol },
        options,
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
    // Comparaison insensible à la casse : ne changer que la graphie
    // (« postgresql » → « PostgreSQL ») reste une mise à jour de la même ligne.
    const pairChanged =
      newTechnology.toLowerCase() !== existing.technology.toLowerCase() ||
      newProduct.toLowerCase() !== existing.product.toLowerCase();
    if (pairChanged) {
      const conflict = await this.findExistingEntry(
        applicationId,
        newTechnology,
        newProduct,
      );
      if (conflict && conflict.id !== id) {
        throw new ConflictException(
          "Ce produit est déjà renseigné pour cette technologie et cette application",
        );
      }
    }

    // Recalcule la fin de vie si le produit ou la version change.
    const eolInputChanged =
      dto.product !== undefined || dto.version !== undefined;
    // #2379 : distinguer « version omise » (garder l'existante) de « version effacée » (null).
    // `dto.version ?? existing.version` traitait null comme absent → l'EOL était recalculée avec
    // l'ANCIENNE version pendant que la version était mise à null, laissant un badge « fin de vie »
    // erroné pendant tout le TTL.
    const newVersion =
      dto.version === undefined ? existing.version : dto.version;
    const eol = eolInputChanged
      ? await this.resolveEol(newProduct, newVersion)
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
