import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { TechnologyEolSource } from "@prisma/client";
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
  withInternalAliases,
  normalizeProductKey,
  parseEolInfo,
  resolveProductReleases,
  type EndoflifeProduct,
  type EolResolution,
} from "./utils/endoflife.utils";
import { EOL_REFRESH_TTL_MS } from "./utils/eol-status";

// Au-delà de ce délai, on rafraîchit paresseusement la fin de vie au GET.

/// Champs de fin de vie persistés sur une ligne de stack. Tous optionnels : un objet vide
/// signifie « ne rien réécrire » (endoflife.date indisponible, ligne manuelle à préserver…).
type EolFields = {
  eolProduct?: string | null;
  eolDate?: Date | null;
  eoasDate?: Date | null;
  latestVersion?: string | null;
  eolCycle?: string | null;
  eolCheckedAt?: Date | null;
  eolSource?: TechnologyEolSource;
};

// Remise à zéro d'une fin de vie : la ligne redevient « jamais vérifiée » et sera résolue
// au prochain GET de la fiche ou au prochain passage du cron.
const NEVER_CHECKED_EOL: EolFields = {
  eolProduct: null,
  eolDate: null,
  eoasDate: null,
  latestVersion: null,
  eolCycle: null,
  eolCheckedAt: null,
};

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
  ): EolFields {
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
  ): Promise<EolFields> {
    if (this.eolDisabled() || !product?.trim()) return {};
    return this.eolFieldsFrom(await resolveProductReleases(product), version);
  }

  // Champs persistés pour une fin de vie saisie à la main (#2454). La date fait foi et
  // tout ce qu'endoflife.date aurait pu écrire est effacé : un slug ou un cycle résiduels
  // feraient passer la ligne pour une résolution automatique. `eolCheckedAt` est daté pour
  // que la fiche ne l'affiche pas « Non vérifiée » ; c'est `eolSource`, et non ce TTL, qui
  // la soustrait ensuite au rafraîchissement paresseux comme au cron.
  private manualEolFields(manualEolDate: string): EolFields {
    const eolDate = new Date(manualEolDate);
    // Ceinture après la validation du DTO : un `Date` invalide serait refusé par
    // Prisma en 500, alors qu'il s'agit d'une saisie erronée.
    if (Number.isNaN(eolDate.getTime())) {
      throw new BadRequestException(
        "manualEolDate doit être une date valide au format AAAA-MM-JJ",
      );
    }
    return {
      eolSource: TechnologyEolSource.manual,
      eolDate,
      eoasDate: null,
      eolProduct: null,
      eolCycle: null,
      latestVersion: null,
      eolCheckedAt: new Date(),
    };
  }

  // Champs de fin de vie à écrire sur une ligne existante, selon la saisie manuelle reçue :
  // - chaîne → la saisie humaine remplace tout, sans appel à endoflife.date ;
  // - null → la saisie est effacée et l'automatique reprend la main : résolution forcée,
  //   même si produit et version n'ont pas changé. Une ligne manuelle est d'abord remise
  //   à « jamais vérifiée » : sinon, endoflife.date en échec laisserait la date manuelle
  //   affichée comme si elle venait du calcul ;
  // - absente → une ligne manuelle n'est JAMAIS touchée, même si produit ou version
  //   changent (une saisie humaine ne se détruit pas implicitement) ; une ligne
  //   automatique est recalculée quand le produit ou la version change.
  private async eolFieldsForUpdate(
    existing: { eolSource?: TechnologyEolSource },
    manualEolDate: string | null | undefined,
    product: string,
    version: string | null,
    eolInputChanged: boolean,
  ): Promise<EolFields> {
    if (typeof manualEolDate === "string") {
      return this.manualEolFields(manualEolDate);
    }
    const wasManual = existing.eolSource === TechnologyEolSource.manual;
    if (manualEolDate === null) {
      return {
        eolSource: TechnologyEolSource.endoflife,
        ...(wasManual || eolInputChanged ? NEVER_CHECKED_EOL : {}),
        ...(await this.resolveEol(product, version)),
      };
    }
    if (wasManual || !eolInputChanged) return {};
    // #2516 : produit ou version changent → l'ancienne fin de vie ne vaut plus rien. Si
    // endoflife.date est muet (« unavailable » → aucun champ), la ligne repasse « jamais
    // vérifiée » (retentée au prochain GET) au lieu de garder le badge de l'ANCIEN produit,
    // avec un `eolCheckedAt` frais qui l'aurait figé pendant tout le TTL.
    return {
      ...NEVER_CHECKED_EOL,
      ...(await this.resolveEol(product, version)),
    };
  }

  // Catalogue des produits suivis par endoflife.date (autocomplétion côté front).
  // Best-effort : liste vide si le catalogue n'a jamais pu être récupéré (le front
  // retombe alors sur la saisie libre).
  async listEolProducts(): Promise<EndoflifeProduct[]> {
    if (this.eolDisabled()) return [];
    // Les alias internes (« Java », « SQL Server »…) sont servis avec le catalogue :
    // sans eux, le formulaire tiendrait pour inconnu un produit que le backend résout,
    // et proposerait la saisie manuelle à la place d'une date calculée juste.
    return withInternalAliases((await fetchProductCatalog()) ?? []);
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
        // Une saisie manuelle (#2454) n'est jamais recalculée : la date vient d'un humain,
        // endoflife.date n'a rien à en dire — et l'écraserait par du vide.
        if (row.eolSource === TechnologyEolSource.manual) return row;
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

    // `manualEolDate` n'est pas une colonne : il pilote les champs de fin de vie écrits
    // ci-dessous et ne doit jamais atteindre Prisma tel quel.
    const { manualEolDate, ...data } = dto;

    const existing = await this.findExistingEntry(
      applicationId,
      data.technology,
      data.product,
    );
    if (existing) {
      // Le couple technologie/produit est déjà renseigné (à la casse près) :
      // on met à jour la ligne existante au lieu de créer un doublon. La
      // graphie déjà enregistrée est conservée ; le formulaire soumis fait
      // foi pour la version et le lien documentaire.
      // Le formulaire d'AJOUT n'affiche jamais la date manuelle d'une ligne existante :
      // son `null` (champ proposé mais laissé vide) ne peut pas valoir « effacer ».
      // Seule l'édition, qui montre la date, peut la retirer.
      const manualEolDateForMerge =
        manualEolDate === null &&
        existing.eolSource === TechnologyEolSource.manual
          ? undefined
          : manualEolDate;
      const eol = await this.eolFieldsForUpdate(
        existing,
        manualEolDateForMerge,
        existing.product,
        data.version ?? null,
        true,
      );
      return super.update(
        existing.id,
        { version: data.version ?? null, docUrl: data.docUrl ?? null, ...eol },
        options,
      );
    }

    const eol =
      typeof manualEolDate === "string"
        ? this.manualEolFields(manualEolDate)
        : await this.resolveEol(data.product, data.version);
    return super.create({ ...data, ...eol, applicationId }, options);
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

    const { manualEolDate, ...data } = dto;

    const newTechnology = data.technology ?? existing.technology;
    const newProduct = data.product ?? existing.product;
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
      data.product !== undefined || data.version !== undefined;
    // #2379 : distinguer « version omise » (garder l'existante) de « version effacée » (null).
    // `dto.version ?? existing.version` traitait null comme absent → l'EOL était recalculée avec
    // l'ANCIENNE version pendant que la version était mise à null, laissant un badge « fin de vie »
    // erroné pendant tout le TTL.
    const newVersion =
      data.version === undefined ? existing.version : data.version;
    const eol = await this.eolFieldsForUpdate(
      existing,
      manualEolDate,
      newProduct,
      newVersion,
      eolInputChanged,
    );

    return super.update(id, { ...data, ...eol }, options);
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
