import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { BadRequestException, Logger } from "@nestjs/common";
import { type Response, fetch } from "undici";
import {
  computeEcoIndex,
  computeGreenhouseGasesEmissionfromEcoIndex,
  computeWaterConsumptionfromEcoIndex,
} from "ecoindex";
import {
  describeFetchError,
  getOutboundDispatcher,
} from "src/common/http/outbound-dispatcher";

const ECOINDEX_FETCH_TIMEOUT_MS = 10_000;

/// Contexte de log des échecs du scan (la configuration proxy retenue est annoncée
/// sous « OutboundHttp », cf. src/common/http/outbound-dispatcher.ts).
const logger = new Logger("EcoIndex");

function ipv4ToInt(ip: string): number {
  return (
    ip.split(".").reduce((acc, octet) => acc * 256 + Number(octet), 0) >>> 0
  );
}

/**
 * Adresse non routable publiquement (loopback, privée RFC1918, link-local incluant les
 * métadonnées cloud 169.254.169.254, CGNAT, IPv6 loopback/ULA/link-local). Rejeter ces cibles
 * empêche le scan EcoIndex d'atteindre l'infrastructure interne (SSRF, #2373).
 */
export function isPrivateAddress(ip: string): boolean {
  const v4 = ip.toLowerCase().startsWith("::ffff:") ? ip.slice(7) : ip;
  if (isIP(v4) === 4) {
    const n = ipv4ToInt(v4);
    const inRange = (base: string, bits: number) =>
      n >>> (32 - bits) === ipv4ToInt(base) >>> (32 - bits);
    return (
      inRange("0.0.0.0", 8) ||
      inRange("10.0.0.0", 8) ||
      inRange("100.64.0.0", 10) ||
      inRange("127.0.0.0", 8) ||
      inRange("169.254.0.0", 16) ||
      inRange("172.16.0.0", 12) ||
      inRange("192.168.0.0", 16)
    );
  }
  const lower = ip.toLowerCase();
  return (
    lower === "::1" ||
    lower === "::" ||
    lower.startsWith("fc") ||
    lower.startsWith("fd") ||
    lower.startsWith("fe80")
  );
}

/**
 * Valide une URL cible avant tout `fetch` sortant (#2373) : schéma http(s) et hôte qui NE résout
 * PAS vers une adresse interne. Note : une fenêtre TOCTOU de DNS-rebinding subsiste (le `fetch`
 * re-résout l'hôte) ; les redirections sont bloquées à l'appel (`redirect: "error"`), et une
 * protection totale exigerait un dispatcher qui vérifie l'IP au connect — hors périmètre ici.
 * Derrière un proxy sortant (#2447), la limite s'élargit : c'est le proxy qui résout l'hôte
 * cible, avec ses propres résolveurs, et cette garde ne voit pas ce chemin. Elle reste utile
 * (IP littérales et hôtes que le DNS local déclare internes sont rejetés avant tout appel),
 * mais le cloisonnement du chemin réel relève alors des règles du proxy.
 */
export async function assertPublicHttpUrl(rawUrl: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw rejectTarget("(URL invalide)", "URL cible EcoIndex invalide");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw rejectTarget(url.host, "L'URL cible EcoIndex doit être en http(s)");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host)
    ? [{ address: host }]
    : await lookup(host, { all: true }).catch(() => {
        // Derrière un proxy, ce rejet signifie souvent que le pod ne résout pas les
        // noms externes : la garde a besoin du DNS local, même si le proxy sait
        // résoudre de son côté. Sans trace, l'exploitant ne verrait qu'un 400.
        throw rejectTarget(
          url.host,
          "Hôte de l'URL cible EcoIndex introuvable",
          "le pod ne résout pas cet hôte (derrière un proxy, la garde exige tout de même le DNS local)",
        );
      });
  if (addresses.some(({ address }) => isPrivateAddress(address))) {
    throw rejectTarget(
      url.host,
      "L'URL cible EcoIndex pointe vers une adresse interne non autorisée",
    );
  }
}

/// Rejet par la garde : tracé sous « EcoIndex » pour que l'exploitant distingue
/// « rejeté avant tout appel sortant » d'« appel sortant en échec » (le dispatcher
/// n'est jamais sollicité ici, aucune ligne « OutboundHttp » n'apparaîtra).
function rejectTarget(
  host: string,
  message: string,
  hint?: string,
): BadRequestException {
  logger.warn(
    `Scan EcoIndex de ${host} refusé avant tout appel : ${message}${hint ? ` — ${hint}` : ""}`,
  );
  return new BadRequestException(message);
}

const REQUEST_COUNT = 1;

function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

function countDomElements(html: string): number {
  return Math.max(1, (html.match(/<[a-zA-Z][^/!>]*>/g) ?? []).length);
}

function computePageSizeInKb(html: string): number {
  return Math.max(0.01, Buffer.byteLength(html, "utf8") / 1024);
}

function calculateEcoIndexMetricsFromHtml(html: string): {
  score: number;
  ges: number;
  water: number;
} {
  const domElements = countDomElements(html);
  const pageSizeInKb = computePageSizeInKb(html);

  const score = roundTo2(
    computeEcoIndex(domElements, REQUEST_COUNT, pageSizeInKb),
  );
  const ges = roundTo2(computeGreenhouseGasesEmissionfromEcoIndex(score));
  const water = roundTo2(computeWaterConsumptionfromEcoIndex(score));

  return { score, ges, water };
}

/// Sans limiteur, contrairement aux fins de vie : un scan est déclenché à la main,
/// chaque échec mérite sa ligne.
function warnFailure(host: string, reason: string, startedAt: number): void {
  logger.warn(
    `Échec du scan EcoIndex de ${host} : ${reason} (${Date.now() - startedAt} ms)`,
  );
}

export async function calculateEcoIndexMetricsFromUrl(
  targetUrl: string,
): Promise<{
  score: number;
  ges: number;
  water: number;
  calculatedAt: Date;
}> {
  await assertPublicHttpUrl(targetUrl);

  // Hôte seul dans les logs : l'URL cible est une saisie libre qui peut porter des
  // paramètres sensibles (jeton d'accès en query string…).
  const host = new URL(targetUrl).host;
  const startedAt = Date.now();
  let response: Response;
  try {
    // `fetch` d'undici et dispatcher commun : le `fetch` global de Node ignore
    // HTTP_PROXY/HTTPS_PROXY sans NODE_USE_ENV_PROXY=1, et le scan échouait en
    // qualification sans explication (#2447) — cf. src/common/http/outbound-dispatcher.ts.
    response = await fetch(targetUrl, {
      dispatcher: getOutboundDispatcher(),
      redirect: "error",
      signal: AbortSignal.timeout(ECOINDEX_FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    // L'erreur est relancée telle quelle : l'appelant la voit comme avant (délai
    // dépassé, `fetch failed`, redirection refusée…), seul le log est nouveau.
    warnFailure(host, describeFetchError(error), startedAt);
    throw error;
  }

  if (!response.ok) {
    // Corps non lu : le libérer, sinon undici garde la connexion hors du pool.
    await response.body?.cancel().catch(() => undefined);
    warnFailure(host, `statut HTTP ${response.status}`, startedAt);
    throw new Error(`EcoIndex target responded with status ${response.status}`);
  }

  const html = await response.text();
  const { score, ges, water } = calculateEcoIndexMetricsFromHtml(html);

  return {
    score,
    ges,
    water,
    calculatedAt: new Date(),
  };
}
