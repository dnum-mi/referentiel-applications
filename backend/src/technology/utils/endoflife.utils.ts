/// Intégration https://endoflife.date (API v1) pour déterminer la date de fin de
/// vie / fin de support d'une technologie donnée à partir de sa version.
/// Modèle « valeurs calculées + date de dernier calcul » (cf. ecoindex.utils.ts).

const ENDOFLIFE_BASE_URL = "https://endoflife.date/api/v1/products";
const FETCH_TIMEOUT_MS = 5000;

export interface EndoflifeRelease {
  /// Nom du cycle de release (généralement le major, ex. « 20 », ou « 3.11 »)
  name: string;
  isEol?: boolean | null;
  eolFrom?: string | null;
}

/// Alias produit libre (normalisé `[a-z0-9]`) → slug endoflife.date, pour les cas où
/// la normalisation par suppression des caractères spéciaux ne donne pas le bon slug.
const PRODUCT_ALIASES: Record<string, string> = {
  sqlserver: "mssqlserver",
  net: "dotnet",
  netcore: "dotnet",
  postgres: "postgresql",
};

/// Normalise un nom de produit libre en identifiant produit endoflife.date
/// (ex. « Node.js » → « nodejs », « PostgreSQL » → « postgresql », « SQL Server » →
/// « mssqlserver », « .NET » → « dotnet »).
export function toEndoflifeProduct(product: string): string {
  const slug = product
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return PRODUCT_ALIASES[slug] ?? slug;
}

/// Sélectionne le cycle de release correspondant à une version : correspondance
/// exacte sur le nom de cycle, ou version préfixée par le cycle (« 20.11 » → « 20 »).
export function matchRelease(
  releases: EndoflifeRelease[],
  version: string,
): EndoflifeRelease | null {
  const v = version.trim();
  if (!v) return null;
  return (
    releases.find(
      (release) =>
        !!release.name &&
        (v === release.name || v.startsWith(`${release.name}.`)),
    ) ?? null
  );
}

/// Extrait la date de fin de vie d'un ensemble de releases pour une version.
/// Fonction pure (testable sans réseau).
export function parseEolDate(
  releases: EndoflifeRelease[],
  version: string,
): Date | null {
  const release = matchRelease(releases, version);
  if (!release?.eolFrom) return null;
  const date = new Date(release.eolFrom);
  return Number.isNaN(date.getTime()) ? null : date;
}

/// Récupère les cycles de release d'un produit sur endoflife.date. Best-effort : toute
/// erreur (produit inconnu, réseau, timeout) renvoie `null`. Isolé de la résolution de
/// version pour pouvoir être mémoïsé par produit (dédup des appels réseau).
export async function fetchProductReleases(
  product: string,
): Promise<EndoflifeRelease[] | null> {
  const slug = toEndoflifeProduct(product);
  // Garde stricte : le segment produit ne peut contenir que [a-z0-9] (pas de « / »,
  // « . » ni caractère spécial) → pas d'injection de chemin ni de SSRF possible.
  if (!/^[a-z0-9]+$/.test(slug)) return null;

  try {
    const response = await fetch(
      `${ENDOFLIFE_BASE_URL}/${encodeURIComponent(slug)}`,
      { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) },
    );
    if (!response.ok) return null;

    const payload = (await response.json()) as {
      result?: { releases?: EndoflifeRelease[] };
    };
    return payload?.result?.releases ?? [];
  } catch {
    return null;
  }
}
