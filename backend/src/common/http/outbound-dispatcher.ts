/// Dispatcher HTTP commun aux appels sortants HORS du SI : catalogue et produits
/// endoflife.date (fins de vie des technologies), page cible du scan EcoIndex.
/// À passer au `fetch` d'undici appel par appel (`dispatcher: getOutboundDispatcher()`).
///
/// Pourquoi le `fetch` d'undici et non le `fetch` global de Node : ce dernier
/// ignore HTTP_PROXY/HTTPS_PROXY tant que NODE_USE_ENV_PROXY=1 n'est pas posé, et
/// le chart Helm de qualification définit le proxy sans ce flag — le catalogue
/// endoflife.date n'a jamais pu être récupéré, puis le scan EcoIndex échouait sans
/// explication (#2447). `EnvHttpProxyAgent` honore HTTP_PROXY/HTTPS_PROXY/NO_PROXY
/// (majuscules comme minuscules) et se comporte en accès direct quand rien n'est
/// défini (dev local).
///
/// Pourquoi pas `setGlobalDispatcher` : les autres appels sortants du backend
/// (MAIA, JWKS Keycloak via jose) sont internes au SI et ne doivent pas être
/// routés vers le proxy ; le dispatcher est donc passé explicitement par les seuls
/// appels qui sortent du SI, créé paresseusement et une seule fois pour le
/// processus (pool de connexions partagé).

import { Logger } from "@nestjs/common";
import { EnvHttpProxyAgent } from "undici";

/// Contexte de log à chercher pour connaître la configuration proxy retenue.
const logger = new Logger("OutboundHttp");

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
/// précédence que lui : minuscules avant majuscules, variable vide = absente ; les
/// cibles HTTPS suivent HTTPS_PROXY puis, à défaut, HTTP_PROXY ; les cibles HTTP
/// (une URL de scan EcoIndex peut l'être) suivent HTTP_PROXY seul. Quand les deux
/// chemins diffèrent, l'annonce les distingue : l'exploitant ne doit pas croire
/// une cible HTTP relayée alors qu'elle part en direct. Fonction pure (testable
/// sans réseau), identifiants masqués.
export function describeProxyConfig(env: NodeJS.ProcessEnv): string {
  const httpProxy = env.http_proxy ?? env.HTTP_PROXY;
  const httpsProxy = env.https_proxy ?? env.HTTPS_PROXY;
  const httpsRoute = httpsProxy || httpProxy;
  if (!httpsRoute) {
    return "Appels sortants hors SI en accès direct (aucune variable HTTPS_PROXY/HTTP_PROXY définie)";
  }
  const noProxy = env.no_proxy ?? env.NO_PROXY;
  const exclusions = noProxy ? `, exclusions NO_PROXY « ${noProxy} »` : "";
  if (!httpProxy) {
    return `Appels sortants hors SI via le proxy ${maskProxyUrl(httpsRoute)} pour les cibles HTTPS, en accès direct pour les cibles HTTP (HTTP_PROXY non défini)${exclusions}`;
  }
  if (httpProxy !== httpsRoute) {
    return `Appels sortants hors SI via le proxy ${maskProxyUrl(httpsRoute)} pour les cibles HTTPS, ${maskProxyUrl(httpProxy)} pour les cibles HTTP${exclusions}`;
  }
  return `Appels sortants hors SI via le proxy ${maskProxyUrl(httpsRoute)}${exclusions}`;
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
    // `redirect: "error"` : undici enveloppe une Error(« unexpected redirect ») sans
    // code. La libeller « erreur réseau » enverrait l'exploitant soupçonner le proxy
    // alors que l'URL cible doit simplement être l'adresse finale (http → https, www…).
    if (cause.message === "unexpected redirect") {
      return "redirection refusée (l'URL cible doit être l'adresse finale, sans redirection)";
    }
    return `erreur réseau ${cause.code ?? cause.name ?? "inconnue"} (${cause.message ?? ""})`;
  }
  // Sans cause enveloppée, le code de l'erreur (ERR_INVALID_URL, UND_ERR_INVALID_ARG…)
  // est plus parlant que son nom générique.
  return `${failure.code ?? failure.name ?? "Error"} : ${failure.message ?? ""}`;
}

/// Fabrique un limiteur « au plus un avertissement par clé et par fenêtre », pour
/// les flux sollicités à chaque requête : les résolutions de fin de vie ont lieu à
/// chaque consultation de fiche, un endoflife.date injoignable inonderait sinon
/// les logs d'un warn par produit et par requête. Sans effet de bord hors de sa
/// propre mémoire (testable sans réseau ni horloge).
export function createWarnThrottle(
  windowMs: number,
): (key: string, now?: number) => boolean {
  const lastWarnAt = new Map<string, number>();
  return (key, now = Date.now()) => {
    // Purge des entrées expirées : les clés peuvent dériver de saisies libres
    // (URL produit en mode dégradé, sans catalogue) et ne sont pas bornées.
    for (const [seenKey, at] of lastWarnAt) {
      if (now - at >= windowMs) lastWarnAt.delete(seenKey);
    }
    if (lastWarnAt.has(key)) return false;
    lastWarnAt.set(key, now);
    return true;
  };
}

let dispatcher: EnvHttpProxyAgent | null = null;
/// Échec de construction mémorisé : la configuration proxy ne change pas en cours
/// de vie du processus, inutile de retenter (et de réémettre l'erreur) à chaque appel.
let failure: { error: unknown } | null = null;

/// Dispatcher partagé des appels sortants hors SI, créé au premier appel. Une URL
/// de proxy inutilisable (« proxy:3128 » sans schéma) fait lever le constructeur :
/// l'erreur est loggée une fois, puis relancée à chaque appel — l'appelant la
/// traite comme n'importe quel échec réseau.
export function getOutboundDispatcher(): EnvHttpProxyAgent {
  if (dispatcher) return dispatcher;
  if (failure) throw failure.error;
  // Annonce AVANT la construction : l'exploitant doit lire la configuration
  // retenue plutôt qu'un échec imputé à endoflife.date ou à la page scannée.
  logger.log(describeProxyConfig(process.env));
  try {
    dispatcher = new EnvHttpProxyAgent();
  } catch (error) {
    failure = { error };
    logger.error(
      `Proxy sortant inutilisable (HTTPS_PROXY/HTTP_PROXY) : ${describeFetchError(error)}`,
    );
    throw error;
  }
  return dispatcher;
}

/// Réservé aux tests : oublie le dispatcher (ou l'échec) mémorisé pour rejouer
/// la première construction avec un autre environnement.
export function resetOutboundDispatcher(): void {
  dispatcher = null;
  failure = null;
}
