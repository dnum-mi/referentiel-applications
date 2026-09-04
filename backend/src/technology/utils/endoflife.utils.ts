/// Intégration https://endoflife.date (API v1) pour déterminer la date de fin de
/// vie / fin de support d'une technologie donnée à partir de sa version.
/// Modèle « valeurs calculées + date de dernier calcul » (cf. ecoindex.utils.ts).
///
/// La résolution du produit s'appuie sur le catalogue `GET /products` (noms, labels
/// et alias officiels, mis en cache en mémoire) plutôt que sur une normalisation
/// aveugle : cela permet de distinguer « produit non suivi par endoflife.date »
/// (statut `unknown-product`, persisté) d'une simple indisponibilité réseau
/// (statut `unavailable`, aucune écriture).

import { Logger } from "@nestjs/common";
import { type Response, fetch } from "undici";
import {
  createWarnThrottle,
  describeFetchError,
  getOutboundDispatcher,
} from "src/common/http/outbound-dispatcher";

const ENDOFLIFE_BASE_URL = "https://endoflife.date/api/v1/products";
const FETCH_TIMEOUT_MS = 5000;
const CATALOG_TTL_MS = 24 * 60 * 60 * 1000; // 24 h
/// Silence entre deux avertissements pour une même URL en échec.
const FAILURE_WARN_WINDOW_MS = 60 * 1000;

/// Interrupteur d'exploitation des appels à endoflife.date (ENDOFLIFE_ENABLED=false),
/// partagé entre la résolution paresseuse des fiches et le recalcul planifié : un
/// interrupteur qui ne coupait que les fiches laissait le cron appeler
/// endoflife.date la nuit.
export function isEndoflifeSwitchedOff(): boolean {
  return process.env.ENDOFLIFE_ENABLED === "false";
}

/// Résolution depuis les fiches : coupée aussi en test (aucun appel non
/// déterministe). Le cron, lui, n'est jamais planifié en test.
export function isEndoflifeDisabled(): boolean {
  return process.env.NODE_ENV === "test" || isEndoflifeSwitchedOff();
}

/// Contexte de log des échecs d'appel à endoflife.date (la configuration proxy
/// retenue est annoncée sous « OutboundHttp », cf. src/common/http/outbound-dispatcher.ts).
const logger = new Logger("Endoflife");

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
  /// Nom du cycle apparié à la version, null si aucun cycle ne correspond. Persisté
  /// pour que le front distingue « version non reconnue » (cycle null) de « cycle
  /// connu sans échéance publiée » (cycle renseigné, dates nulles) : les dates
  /// seules sont nulles dans les deux cas (#2449).
  cycle: string | null;
}

export type EolResolution =
  /// Produit reconnu : cycles de release récupérés
  | { status: "resolved"; slug: string; releases: EndoflifeRelease[] }
  /// Produit absent du catalogue endoflife.date. Jamais renvoyé en mode dégradé
  /// (catalogue jamais récupéré) : sans catalogue le slug est deviné, un 404 ne
  /// prouve rien (#2514).
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
  // Le catalogue ne connaît « Java » que par distribution (Oracle JDK, Temurin,
  // Corretto…). Une saisie générique « Java » / « JDK » est rapportée à Oracle JDK,
  // la distribution de référence (endoflife.date lui réserve l'alias « oracle-java ») ;
  // « OpenJDK » à Eclipse Temurin, la build communautaire LTS la plus répandue, dont
  // le calendrier de support est celui des builds OpenJDK libres (les « OpenJDK
  // builds from Oracle » n'ont que six mois de vie par cycle, LTS compris, et
  // signaleraient à tort toute version comme périmée).
  java: "oracle-jdk",
  jdk: "oracle-jdk",
  openjdk: "eclipse-temurin",
  apachehttpd: "apache-http-server",
  docker: "docker-engine",
};

/// Normalise une version saisie librement : espaces superflus et préfixe « v »
/// (« v20.11 » → « 20.11 »), fréquent pour Node.js et les outils publiés sur GitHub.
function normalizeVersion(version: string): string {
  return version.trim().replace(/^v(?=\d)/i, "");
}

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

/// Catalogue enrichi des alias internes, tel qu'il doit être servi au front : le
/// formulaire juge un produit « connu » d'après ce catalogue, et doit donc voir les
/// mêmes alias que la résolution backend (sinon « Java » y passe pour non suivi
/// alors qu'il est résolu). Fonction pure ; les produits sont copiés, pas mutés.
export function withInternalAliases(
  products: EndoflifeProduct[],
): EndoflifeProduct[] {
  const extraAliases = new Map<string, string[]>();
  for (const [alias, slug] of Object.entries(PRODUCT_ALIASES)) {
    extraAliases.set(slug, [...(extraAliases.get(slug) ?? []), alias]);
  }
  return products.map((product) => {
    const extras = extraAliases.get(product.name);
    if (!extras) return product;
    const known = new Set(
      [product.name, product.label ?? "", ...product.aliases].map(
        normalizeProductKey,
      ),
    );
    const added = extras.filter((alias) => !known.has(alias));
    return added.length
      ? { ...product, aliases: [...product.aliases, ...added] }
      : product;
  });
}

/// Sélectionne le cycle de release correspondant à une version : correspondance
/// exacte sur le nom de cycle, version préfixée par le cycle (« 20.11 » → « 20 »),
/// major seul désignant un unique cycle (« 9 » → Tomcat « 9.0 »), puis repli sur
/// le libellé commercial (« 2019 » → SQL Server « 15.0 », dont le label est
/// « 2019 'Aris/Seattle' ») ou le nom de code (« bookworm » → Debian 12).
///
/// Une version trop imprécise pour désigner un cycle (« 3 » pour Python, « 8 »
/// pour MySQL, dont les cycles 8.0 et 8.4 n'ont pas la même fin de vie) ne
/// renvoie rien : mieux vaut aucune date qu'une date d'un autre cycle.
export function matchRelease(
  releases: EndoflifeRelease[],
  version: string,
): EndoflifeRelease | null {
  const v = normalizeVersion(version);
  if (!v) return null;

  const byName = releases.find(
    (release) =>
      !!release.name &&
      (v === release.name || v.startsWith(`${release.name}.`)),
  );
  if (byName) return byName;

  // « 9 » saisi pour des cycles nommés « 9.0 », « 10.1 »… : un seul cycle porte ce
  // major, l'ambiguïté est levée. Plusieurs (MySQL « 8.0 » / « 8.4 ») : on renonce.
  const byMajor = releases.filter((release) =>
    release.name?.startsWith(`${v}.`),
  );
  if (byMajor.length === 1) return byMajor[0];

  return (
    releases.find((release) => {
      const label = release.label?.trim();
      // Préfixe à frontière non alphanumérique : « 2019 » matche « 2019 'Aris/Seattle' »
      // mais pas « 20191 ». Le point n'est pas une frontière : « 3 » ne doit pas
      // matcher le label « 3.14 » (ce serait la fin de vie du dernier cycle Python,
      // pas celle de la version réellement déployée).
      if (
        label &&
        (label === v ||
          (label.startsWith(v) && !/[a-z0-9.]/i.test(label.charAt(v.length))))
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
    cycle: release?.name ?? null,
  };
}

type FetchResult =
  | { kind: "ok"; data: unknown }
  | { kind: "not-found" }
  | { kind: "error" };

const shouldWarn = createWarnThrottle(FAILURE_WARN_WINDOW_MS);

function warnFailure(url: string, reason: string, startedAt: number): void {
  if (!shouldWarn(url)) return;
  logger.warn(
    `Échec GET ${url} : ${reason} (${Date.now() - startedAt} ms) — prochain avertissement pour cette URL dans ${FAILURE_WARN_WINDOW_MS / 1000} s au plus tôt`,
  );
}

// `fetch` d'undici et dispatcher commun plutôt que le `fetch` global de Node,
// sourd à HTTP_PROXY/HTTPS_PROXY sans NODE_USE_ENV_PROXY=1 : le POURQUOI complet
// est dans src/common/http/outbound-dispatcher.ts.

/// Libère la connexion d'une réponse dont le corps ne sera pas lu : undici ne
/// rend le socket au pool qu'une fois le corps consommé ou annulé.
async function discardBody(response: Response): Promise<void> {
  await response.body?.cancel().catch(() => undefined);
}

/// `notFoundIsFailure` : un 404 est le cas nominal d'un produit inconnu, mais
/// jamais celui de l'URL du catalogue — là, il trahit un proxy ou un filtrage
/// d'URL qui répond à la place d'endoflife.date, ou une API déplacée. Le taire
/// reproduirait exactement la panne muette de qualification.
async function fetchJson(
  url: string,
  { notFoundIsFailure = false }: { notFoundIsFailure?: boolean } = {},
): Promise<FetchResult> {
  if (isEndoflifeOutageMemoized()) return { kind: "error" };
  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      dispatcher: getOutboundDispatcher(),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (response.status === 404) {
      await discardBody(response);
      if (notFoundIsFailure) {
        warnFailure(
          url,
          "statut HTTP 404 sur le catalogue (proxy ou filtrage d'URL qui répond à la place d'endoflife.date, ou API déplacée)",
          startedAt,
        );
        rememberOutage();
        return { kind: "error" };
      }
      clearEndoflifeOutageMemo();
      return { kind: "not-found" };
    }
    if (!response.ok) {
      await discardBody(response);
      warnFailure(url, `statut HTTP ${response.status}`, startedAt);
      rememberOutage();
      return { kind: "error" };
    }
    const data: unknown = await response.json();
    clearEndoflifeOutageMemo();
    return { kind: "ok", data };
  } catch (error) {
    warnFailure(url, describeFetchError(error), startedAt);
    rememberOutage();
    return { kind: "error" };
  }
}

// ── Disjoncteur (#2513) ────────────────────────────────────────────────────────
// Après un échec réseau/HTTP (délai dépassé, connexion absorbée, 5xx, 404 sur le
// catalogue), plus AUCUNE requête n'est tentée pendant OUTAGE_MEMO_MS : chaque appel
// répond aussitôt « error » (→ `unavailable`, aucune écriture). Sans lui, un hôte qui
// absorbe la connexion coûtait 2 × FETCH_TIMEOUT_MS à CHAQUE résolution (ouverture
// d'onglet, POST/PATCH sans date manuelle) — 10 s mesurées — et l'échec n'était
// jamais mémorisé. Une réponse (même 404 produit) referme le disjoncteur.
const OUTAGE_MEMO_MS = 60_000;
let outageUntil = 0;

export function isEndoflifeOutageMemoized(now: number = Date.now()): boolean {
  return now < outageUntil;
}

function rememberOutage(): void {
  if (!isEndoflifeOutageMemoized()) {
    logger.warn(
      `endoflife.date injoignable : résolutions court-circuitées pendant ${OUTAGE_MEMO_MS / 1000} s (statut « non vérifiée », aucune écriture)`,
    );
  }
  outageUntil = Date.now() + OUTAGE_MEMO_MS;
}

/// Réservé aux tests : referme le disjoncteur.
export function clearEndoflifeOutageMemo(): void {
  outageUntil = 0;
}

let catalogCache: { products: EndoflifeProduct[]; expiresAt: number } | null =
  null;
// #2520 : promesse de téléchargement en cours, partagée. Sans elle, à l'expiration du
// cache, K produits distincts résolus en parallèle (ouverture d'un onglet, lot du cron)
// déclenchaient K téléchargements simultanés du catalogue.
let catalogInFlight: Promise<EndoflifeProduct[] | null> | null = null;

/// Réservé aux tests : réinitialise le cache du catalogue (et le disjoncteur, pour
/// qu'un test en panne ne contamine pas le suivant).
export function clearProductCatalogCache(): void {
  catalogCache = null;
  catalogInFlight = null;
  clearEndoflifeOutageMemo();
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
  if (!catalogInFlight) {
    catalogInFlight = downloadProductCatalog(now).finally(() => {
      catalogInFlight = null;
    });
  }
  return catalogInFlight;
}

async function downloadProductCatalog(
  now: number,
): Promise<EndoflifeProduct[] | null> {
  const payload = await fetchJson(ENDOFLIFE_BASE_URL, {
    notFoundIsFailure: true,
  });
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

  if (catalog) {
    const slug = lookupProductSlug(productIndexFor(catalog), product);
    if (!slug) return { status: "unknown-product" };
    const releases = await fetchProductReleases(slug);
    if (releases === "not-found") return { status: "unknown-product" };
    if (releases === null) return { status: "unavailable" };
    return { status: "resolved", slug, releases };
  }

  // Mode dégradé (#2514) : le slug est DEVINÉ par la normalisation historique, qui
  // supprime les tirets — près de la moitié des slugs réels en contiennent — et un
  // proxy filtrant peut répondre 404 à tout. Un 404 ne prouve donc pas que le produit
  // est inconnu : rien n'est persisté (« unavailable »), la ligne sera retentée dès
  // que le catalogue sera de nouveau disponible. Seule une résolution POSITIVE compte.
  const guessedSlug = toEndoflifeProduct(product);
  if (!guessedSlug) return { status: "unavailable" };
  const releases = await fetchProductReleases(guessedSlug);
  if (releases === "not-found" || releases === null) {
    return { status: "unavailable" };
  }
  return { status: "resolved", slug: guessedSlug, releases };
}
