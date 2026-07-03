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

export interface TechnologyEol {
  eolDate: Date | null;
  eolCheckedAt: Date;
}

/// Normalise un nom de technologie libre en identifiant produit endoflife.date
/// (ex. « Node.js » → « nodejs », « PostgreSQL » → « postgresql »).
export function toEndoflifeProduct(technology: string): string {
  return technology
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
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

/// Interroge endoflife.date pour une technologie + version. Best-effort : toute
/// erreur (produit inconnu, réseau, timeout) renvoie une date nulle.
export async function fetchTechnologyEol(
  technology: string,
  version?: string | null,
): Promise<TechnologyEol> {
  const eolCheckedAt = new Date();
  const empty: TechnologyEol = { eolDate: null, eolCheckedAt };

  if (!technology?.trim() || !version?.trim()) return empty;

  const product = toEndoflifeProduct(technology);
  // Garde stricte : le segment produit ne peut contenir que [a-z0-9] (pas de « / »,
  // « . » ni caractère spécial) → pas d'injection de chemin ni de SSRF possible.
  if (!/^[a-z0-9]+$/.test(product)) return empty;

  try {
    const response = await fetch(
      `${ENDOFLIFE_BASE_URL}/${encodeURIComponent(product)}`,
      {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      },
    );
    if (!response.ok) return empty;

    const payload = (await response.json()) as {
      result?: { releases?: EndoflifeRelease[] };
    };
    const releases = payload?.result?.releases ?? [];
    return { eolDate: parseEolDate(releases, version), eolCheckedAt };
  } catch {
    return empty;
  }
}
