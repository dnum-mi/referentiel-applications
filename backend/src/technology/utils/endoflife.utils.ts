/// Intégration https://endoflife.date (API v1) pour déterminer la date de fin de
/// vie / fin de support d'une technologie donnée à partir de sa version.
/// Modèle « valeurs calculées + date de dernier calcul » (cf. ecoindex.utils.ts).
///
/// La résolution du produit s'appuie sur le catalogue `GET /products` (noms, labels
/// et alias officiels, mis en cache en mémoire) plutôt que sur une normalisation
/// aveugle : cela permet de distinguer « produit non suivi par endoflife.date »
/// (statut `unknown-product`, persisté) d'une simple indisponibilité réseau
/// (statut `unavailable`, aucune écriture).

const ENDOFLIFE_BASE_URL = "https://endoflife.date/api/v1/products";
const FETCH_TIMEOUT_MS = 5000;
const CATALOG_TTL_MS = 24 * 60 * 60 * 1000; // 24 h

export interface EndoflifeRelease {
  /// Nom du cycle de release (généralement le major, ex. « 20 », ou « 3.11 »)
  name: string;
  /// Libellé commercial du cycle (ex. « 2019 'Aris/Seattle' » pour SQL Server 15.0)
  label?: string | null;
  /// Nom de code du cycle (ex. « bookworm » pour Debian 12)
  codename?: string | null;
  isLts?: boolean | null;
  /// Fin de support actif (End of Active Support)
  isEoas?: boolean | null;
  eoasFrom?: string | null;
  isEol?: boolean | null;
  eolFrom?: string | null;
  isMaintained?: boolean | null;
  /// Dernière version publiée du cycle
  latest?: { name?: string | null } | null;
}

export interface EndoflifeProduct {
  /// Slug produit endoflife.date (ex. « nodejs »)
  name: string;
  /// Libellé d'affichage (ex. « Node.js »)
  label: string | null;
  category: string | null;
  aliases: string[];
}

/// Valeurs de fin de vie extraites pour une version donnée.
export interface EolInfo {
  eolDate: Date | null;
  eoasDate: Date | null;
  latestVersion: string | null;
}

export type EolResolution =
  /// Produit reconnu : cycles de release récupérés
  | { status: "resolved"; slug: string; releases: EndoflifeRelease[] }
  /// Produit absent du catalogue endoflife.date (ou 404 en mode dégradé)
  | { status: "unknown-product" }
  /// API/réseau indisponible : ne rien écraser, retenter plus tard
  | { status: "unavailable" };

/// Alias produit libre (normalisé `[a-z0-9]`) → slug endoflife.date, en complément
/// des alias officiels du catalogue (saisies courantes côté SI non couvertes).
const PRODUCT_ALIASES: Record<string, string> = {
  sqlserver: "mssqlserver",
  net: "dotnet",
  netcore: "dotnet",
  postgres: "postgresql",
};

/// Normalise un nom libre en clé de comparaison (ex. « Node.js » → « nodejs »).
export function normalizeProductKey(product: string): string {
  return product
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/// Normalisation historique (mode dégradé, sans catalogue) : clé + table d'alias.
export function toEndoflifeProduct(product: string): string {
  const slug = normalizeProductKey(product);
  return PRODUCT_ALIASES[slug] ?? slug;
}

/// Construit l'index clé normalisée → slug à partir du catalogue (slug, label,
/// alias officiels, puis alias internes). Fonction pure (testable sans réseau).
export function buildProductIndex(
  products: EndoflifeProduct[],
): Map<string, string> {
  const index = new Map<string, string>();
  const add = (key: string, slug: string) => {
    const normalized = normalizeProductKey(key);
    if (normalized && !index.has(normalized)) index.set(normalized, slug);
  };
  for (const product of products) {
    add(product.name, product.name);
    if (product.label) add(product.label, product.name);
    for (const alias of product.aliases) add(alias, product.name);
  }
  for (const [alias, slug] of Object.entries(PRODUCT_ALIASES)) {
    add(alias, slug);
  }
  return index;
}

/// Résout un nom de produit libre en slug via l'index (null = produit inconnu).
export function lookupProductSlug(
  index: Map<string, string>,
  product: string,
): string | null {
  return index.get(normalizeProductKey(product)) ?? null;
}

/// Sélectionne le cycle de release correspondant à une version : correspondance
/// exacte sur le nom de cycle, version préfixée par le cycle (« 20.11 » → « 20 »),
/// puis repli sur le libellé commercial (« 2019 » → SQL Server « 15.0 », dont le
/// label est « 2019 'Aris/Seattle' ») ou le nom de code (« bookworm » → Debian 12).
export function matchRelease(
  releases: EndoflifeRelease[],
  version: string,
): EndoflifeRelease | null {
  const v = version.trim();
  if (!v) return null;

  const byName = releases.find(
    (release) =>
      !!release.name &&
      (v === release.name || v.startsWith(`${release.name}.`)),
  );
  if (byName) return byName;

  return (
    releases.find((release) => {
      const label = release.label?.trim();
      // Préfixe à frontière non alphanumérique : « 2019 » matche « 2019 'Aris/Seattle' »
      // mais pas « 20191 ».
      if (
        label &&
        (label === v ||
          (label.startsWith(v) && !/[a-z0-9]/i.test(label.charAt(v.length))))
      ) {
        return true;
      }
      return (
        !!release.codename && release.codename.toLowerCase() === v.toLowerCase()
      );
    }) ?? null
  );
}

function toDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/// Extrait la date de fin de vie d'un ensemble de releases pour une version.
/// Fonction pure (testable sans réseau).
export function parseEolDate(
  releases: EndoflifeRelease[],
  version: string,
): Date | null {
  const release = matchRelease(releases, version);
  return toDate(release?.eolFrom);
}

/// Extrait l'ensemble des valeurs de fin de vie (EOL, fin de support actif,
/// dernière version du cycle) pour une version. Fonction pure.
export function parseEolInfo(
  releases: EndoflifeRelease[],
  version: string,
): EolInfo {
  const release = matchRelease(releases, version);
  return {
    eolDate: toDate(release?.eolFrom),
    eoasDate: toDate(release?.eoasFrom),
    latestVersion: release?.latest?.name ?? null,
  };
}

type FetchResult =
  | { kind: "ok"; data: unknown }
  | { kind: "not-found" }
  | { kind: "error" };

async function fetchJson(url: string): Promise<FetchResult> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (response.status === 404) return { kind: "not-found" };
    if (!response.ok) return { kind: "error" };
    return { kind: "ok", data: await response.json() };
  } catch {
    return { kind: "error" };
  }
}

let catalogCache: { products: EndoflifeProduct[]; expiresAt: number } | null =
  null;

/// Réservé aux tests : réinitialise le cache du catalogue.
export function clearProductCatalogCache(): void {
  catalogCache = null;
}

/// Récupère le catalogue des produits suivis par endoflife.date (cache mémoire
/// 24 h). En cas d'échec réseau, sert la dernière version connue même périmée ;
/// `null` uniquement si aucun catalogue n'a jamais pu être récupéré.
export async function fetchProductCatalog(): Promise<
  EndoflifeProduct[] | null
> {
  const now = Date.now();
  if (catalogCache && catalogCache.expiresAt > now) {
    return catalogCache.products;
  }

  const payload = await fetchJson(ENDOFLIFE_BASE_URL);
  const raw =
    payload.kind === "ok"
      ? (
          payload.data as {
            result?: {
              name?: string;
              label?: string | null;
              category?: string | null;
              aliases?: string[] | null;
            }[];
          }
        )?.result
      : null;

  if (!raw) return catalogCache?.products ?? null;

  const products: EndoflifeProduct[] = raw
    .filter((product): product is { name: string } & typeof product =>
      Boolean(product?.name),
    )
    .map((product) => ({
      name: product.name,
      label: product.label ?? null,
      category: product.category ?? null,
      aliases: product.aliases ?? [],
    }));
  catalogCache = { products, expiresAt: now + CATALOG_TTL_MS };
  return products;
}

/// Récupère les cycles de release d'un produit (slug déjà résolu).
/// `"not-found"` = produit inconnu de l'API, `null` = échec réseau/HTTP.
export async function fetchProductReleases(
  slug: string,
): Promise<EndoflifeRelease[] | "not-found" | null> {
  // Garde stricte : le segment produit ne peut contenir que [a-z0-9-] (pas de « / »,
  // « . » ni caractère spécial) → pas d'injection de chemin ni de SSRF possible.
  if (!/^[a-z0-9-]+$/.test(slug)) return "not-found";

  const payload = await fetchJson(
    `${ENDOFLIFE_BASE_URL}/${encodeURIComponent(slug)}`,
  );
  if (payload.kind === "not-found") return "not-found";
  if (payload.kind === "error") return null;
  return (
    (payload.data as { result?: { releases?: EndoflifeRelease[] } })?.result
      ?.releases ?? []
  );
}

// Index mémoïsé par référence de catalogue (reconstruit uniquement à son
// rafraîchissement, pas à chaque résolution).
let indexMemo: {
  products: EndoflifeProduct[];
  index: Map<string, string>;
} | null = null;

function productIndexFor(products: EndoflifeProduct[]): Map<string, string> {
  if (indexMemo?.products !== products) {
    indexMemo = { products, index: buildProductIndex(products) };
  }
  return indexMemo.index;
}

/// Résout un produit saisi librement en cycles de release endoflife.date.
/// Passe par le catalogue (noms + labels + alias) ; en mode dégradé (catalogue
/// jamais récupéré), retombe sur la normalisation historique du slug.
export async function resolveProductReleases(
  product: string,
): Promise<EolResolution> {
  const catalog = await fetchProductCatalog();

  let slug: string | null;
  if (catalog) {
    slug = lookupProductSlug(productIndexFor(catalog), product);
    if (!slug) return { status: "unknown-product" };
  } else {
    slug = toEndoflifeProduct(product);
    if (!slug) return { status: "unknown-product" };
  }

  const releases = await fetchProductReleases(slug);
  if (releases === "not-found") return { status: "unknown-product" };
  if (releases === null) return { status: "unavailable" };
  return { status: "resolved", slug, releases };
}
