import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { BadRequestException } from "@nestjs/common";
import {
  computeEcoIndex,
  computeGreenhouseGasesEmissionfromEcoIndex,
  computeWaterConsumptionfromEcoIndex,
} from "ecoindex";

const ECOINDEX_FETCH_TIMEOUT_MS = 10_000;

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
 */
export async function assertPublicHttpUrl(rawUrl: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new BadRequestException("URL cible EcoIndex invalide");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new BadRequestException("L'URL cible EcoIndex doit être en http(s)");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host)
    ? [{ address: host }]
    : await lookup(host, { all: true }).catch(() => {
        throw new BadRequestException(
          "Hôte de l'URL cible EcoIndex introuvable",
        );
      });
  if (addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new BadRequestException(
      "L'URL cible EcoIndex pointe vers une adresse interne non autorisée",
    );
  }
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

export async function calculateEcoIndexMetricsFromUrl(
  targetUrl: string,
): Promise<{
  score: number;
  ges: number;
  water: number;
  calculatedAt: Date;
}> {
  await assertPublicHttpUrl(targetUrl);

  const response = await fetch(targetUrl, {
    redirect: "error",
    signal: AbortSignal.timeout(ECOINDEX_FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
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
