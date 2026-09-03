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
import { EnvHttpProxyAgent, type Response, fetch } from "undici";

const ENDOFLIFE_BASE_URL = "https://endoflife.date/api/v1/products";
const FETCH_TIMEOUT_MS = 5000;
const CATALOG_TTL_MS = 24 * 60 * 60 * 1000; // 24 h
/// Silence entre deux avertissements pour une même URL en échec.
const FAILURE_WARN_WINDOW_MS = 60 * 1000;

/// Contexte de log à chercher pour diagnostiquer les appels sortants.
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
  };
}

type FetchResult =
  | { kind: "ok"; data: unknown }
  | { kind: "not-found" }
  | { kind: "error" };

/// Masque une URL de proxy pour les logs : hôte et port seulement, sans les
/// identifiants qu'elle peut embarquer (`http://user:secret@proxy:3128`).
export function maskProxyUrl(proxyUrl: string): string {
  try {
    return new URL(proxyUrl).host || "(URL de proxy invalide)";
  } catch {
    return "(URL de proxy invalide)";
  }
}

/// Résume la configuration proxy que suivra `EnvHttpProxyAgent`, avec la même
/// précédence que lui : minuscules avant majuscules, variable vide = absente,
/// HTTPS avant HTTP (endoflife.date est en HTTPS ; sans HTTPS_PROXY, undici
/// retombe sur HTTP_PROXY). Fonction pure (testable sans réseau), identifiants masqués.
export function describeProxyConfig(env: NodeJS.ProcessEnv): string {
  const httpProxy = env.http_proxy ?? env.HTTP_PROXY;
  const httpsProxy = env.https_proxy ?? env.HTTPS_PROXY;
  const proxy = httpsProxy || httpProxy;
  if (!proxy) {
    return "Appels sortants vers endoflife.date en accès direct (aucune variable HTTPS_PROXY/HTTP_PROXY définie)";
  }
  const noProxy = env.no_proxy ?? env.NO_PROXY;
  const exclusions = noProxy ? `, exclusions NO_PROXY « ${noProxy} »` : "";
  return `Appels sortants vers endoflife.date via le proxy ${maskProxyUrl(proxy)}${exclusions}`;
}

/// Lecture tolérante d'une erreur : `fetch` peut rejeter avec une DOMException,
/// une erreur Node porteuse d'un `code`, ou n'importe quelle valeur.
interface ErrorLike {
  name?: string;
  message?: string;
  code?: string;
  cause?: unknown;
}

function asErrorLike(value: unknown): ErrorLike | null {
  return typeof value === "object" && value !== null
    ? (value as ErrorLike)
    : null;
}

/// Décrit un échec d'appel pour le log : délai dépassé, erreur réseau (undici
/// enveloppe la cause — ECONNREFUSED, ENOTFOUND, UND_ERR_CONNECT_TIMEOUT… — dans
/// un `TypeError: fetch failed`) ou autre exception (corps JSON invalide…).
/// Fonction pure (testable sans réseau).
export function describeFetchError(error: unknown): string {
  const failure = asErrorLike(error);
  if (!failure) return `erreur inattendue (${String(error)})`;
  if (failure.name === "TimeoutError") return "délai dépassé";
  if (failure.name === "AbortError") return "appel interrompu";
  const cause = asErrorLike(failure.cause);
  if (cause) {
    return `erreur réseau ${cause.code ?? cause.name ?? "inconnue"} (${cause.message ?? ""})`;
  }
  // Sans cause enveloppée, le code de l'erreur (ERR_INVALID_URL, UND_ERR_INVALID_ARG…)
  // est plus parlant que son nom générique.
  return `${failure.code ?? failure.name ?? "Error"} : ${failure.message ?? ""}`;
}

/// Fabrique un limiteur « au plus un avertissement par clé et par fenêtre » :
/// les résolutions ont lieu à chaque consultation de fiche, un endoflife.date
/// injoignable inonderait sinon les logs d'un warn par produit et par requête.
/// Sans effet de bord hors de sa propre mémoire (testable sans réseau ni horloge).
export function createWarnThrottle(
  windowMs: number,
): (key: string, now?: number) => boolean {
  const lastWarnAt = new Map<string, number>();
  return (key, now = Date.now()) => {
    // Purge des entrées expirées : en mode dégradé (catalogue jamais récupéré),
    // les URL dérivent de saisies libres et ne sont pas bornées.
    for (const [seenKey, at] of lastWarnAt) {
      if (now - at >= windowMs) lastWarnAt.delete(seenKey);
    }
    if (lastWarnAt.has(key)) return false;
    lastWarnAt.set(key, now);
    return true;
  };
}

const shouldWarn = createWarnThrottle(FAILURE_WARN_WINDOW_MS);

function warnFailure(url: string, reason: string, startedAt: number): void {
  if (!shouldWarn(url)) return;
  logger.warn(
    `Échec GET ${url} : ${reason} (${Date.now() - startedAt} ms) — prochain avertissement pour cette URL dans ${FAILURE_WARN_WINDOW_MS / 1000} s au plus tôt`,
  );
}

// Pourquoi le `fetch` d'undici et non le `fetch` global de Node : ce dernier
// ignore HTTP_PROXY/HTTPS_PROXY tant que NODE_USE_ENV_PROXY=1 n'est pas posé, et
// le chart Helm de qualification (qualifr2) définit le proxy sans ce flag — le
// catalogue n'a jamais pu être récupéré, toutes les résolutions finissaient
// « unavailable » et rien ne l'expliquait. `EnvHttpProxyAgent` honore
// HTTP_PROXY/HTTPS_PROXY/NO_PROXY (majuscules comme minuscules) et se comporte
// en accès direct quand rien n'est défini (dev local).
//
// Pourquoi pas `setGlobalDispatcher` : les autres appels sortants du backend
// (MAIA, JWKS Keycloak via jose) sont internes au SI et ne doivent pas être
// routés vers le proxy ; le dispatcher est donc passé appel par appel, créé
// paresseusement et une seule fois pour le processus (pool de connexions).
let dispatcher: EnvHttpProxyAgent | null = null;
let proxyAnnounced = false;

function getDispatcher(): EnvHttpProxyAgent {
  if (dispatcher) return dispatcher;
  // Annonce AVANT la construction : une URL de proxy malformée (« proxy:3128 »
  // sans schéma) fait lever le constructeur, et l'exploitant doit lire la
  // configuration retenue plutôt qu'un échec imputé à endoflife.date.
  if (!proxyAnnounced) {
    proxyAnnounced = true;
    logger.log(describeProxyConfig(process.env));
  }
  try {
    dispatcher = new EnvHttpProxyAgent();
  } catch (error) {
    logger.error(
      `Proxy sortant inutilisable (HTTPS_PROXY/HTTP_PROXY) : ${describeFetchError(error)}`,
    );
    throw error;
  }
  return dispatcher;
}

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
  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      dispatcher: getDispatcher(),
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
      }
      return { kind: "not-found" };
    }
    if (!response.ok) {
      await discardBody(response);
      warnFailure(url, `statut HTTP ${response.status}`, startedAt);
      return { kind: "error" };
    }
    return { kind: "ok", data: await response.json() };
  } catch (error) {
    warnFailure(url, describeFetchError(error), startedAt);
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
