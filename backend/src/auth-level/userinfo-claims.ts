import { createHash } from "node:crypto";
import type { JWTPayload } from "jose";

/**
 * #1985 — Repli `userinfo` : certains fournisseurs d'identité ne placent les attributs déclarés
 * (dont le mode d'authentification) que dans la réponse de l'endpoint userinfo, pas sur l'access
 * token — c'est d'ailleurs la cinématique décrite par la documentation d'intégration du SSO
 * (« l'application demande les infos de l'utilisateur (claims) »). Quand le claim de mode manque
 * sur le jeton, on interroge userinfo avec ce même jeton, déjà vérifié, et on ne retient que les
 * claims utiles au niveau d'authentification.
 *
 * Garanties :
 * - un seul appel par jeton (cache positif borné par l'expiration du jeton, requêtes concurrentes
 *   dédoublonnées) ; un échec est mis en cache brièvement pour ne pas marteler le fournisseur ;
 * - le `sub` de la réponse est exigé (OIDC Core §5.3.2). RefApp utilise le sujet du jeton
 *   d'accès comme référence : sans sujet de référence non vide et identique, le repli est ignoré ;
 * - une réponse signée (`application/jwt`) est vérifiée avec le JWKS du fournisseur ou le
 *   secret HMAC explicitement configuré côté serveur ; son
 *   émetteur et son audience sont exigés et doivent être ceux du jeton et du client ;
 * - un endpoint découvert doit être une URL http(s) ;
 * - tout échec vaut « claim absent » : le repli ne peut qu'ajouter une preuve, jamais en inventer.
 */
export interface UserinfoClaimsResolverOptions {
  /** URL explicite de l'endpoint ; à défaut, `userinfo_endpoint` du document de découverte. */
  url?: string;
  /** Document de découverte OIDC du fournisseur (`OIDC_CONFIG_URL`). */
  discoveryUrl: string;
  /** Claims à retenir (claim de mode et claim de fournisseur). */
  claimNames: string[];
  /** Identifiant du client OIDC : audience attendue d'une réponse signée. */
  clientId?: string;
  timeoutMs: number;
  /** Vérifie une réponse userinfo signée (application/jwt). */
  verifyJwt: (jwt: string) => Promise<JWTPayload>;
  /** Une configuration HMAC explicite exige une réponse signée, sans repli JSON. */
  requireSignedResponse?: boolean;
  /** Journalisation des échecs (au plus une ligne par minute). */
  onError?: (message: string) => void;
  now?: () => number;
  fetchFn?: typeof fetch;
  maxEntries?: number;
}

type Claims = Record<string, unknown>;
interface CacheEntry {
  claims: Claims;
  expiresAt: number;
}

export const USERINFO_POSITIVE_TTL_MS = 5 * 60_000;
export const USERINFO_NEGATIVE_TTL_MS = 30_000;
const DISCOVERY_RETRY_MS = 60_000;
const ERROR_LOG_INTERVAL_MS = 60_000;
const DEFAULT_MAX_ENTRIES = 10_000;

export class UserinfoClaimsResolver {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly inflight = new Map<string, Promise<Claims>>();
  private endpoint: string | undefined;
  private discoveryFailedAt: number | undefined;
  private lastErrorLogAt: number | undefined;

  constructor(private readonly options: UserinfoClaimsResolverOptions) {
    this.endpoint = options.url;
  }

  /** Claims utiles lus sur userinfo pour ce jeton ({} si absents ou en cas d'échec). */
  async resolve(accessToken: string, payload: JWTPayload): Promise<Claims> {
    const key = createHash("sha256").update(accessToken).digest("hex");
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > this.now()) return cached.claims;
    if (cached) this.cache.delete(key);

    const pending = this.inflight.get(key);
    if (pending) return pending;

    const request = this.fetchAndCache(key, accessToken, payload).finally(() =>
      this.inflight.delete(key),
    );
    this.inflight.set(key, request);
    return request;
  }

  private async fetchAndCache(
    key: string,
    accessToken: string,
    payload: JWTPayload,
  ): Promise<Claims> {
    let claims: Claims = {};
    let ttl = USERINFO_NEGATIVE_TTL_MS;
    try {
      claims = await this.fetchClaims(accessToken, payload);
      ttl = USERINFO_POSITIVE_TTL_MS;
    } catch (error) {
      this.reportError(error);
    }
    const now = this.now();
    const tokenExpiry =
      typeof payload.exp === "number"
        ? payload.exp * 1000
        : Number.POSITIVE_INFINITY;
    this.store(key, { claims, expiresAt: Math.min(now + ttl, tokenExpiry) });
    return claims;
  }

  private async fetchClaims(
    accessToken: string,
    payload: JWTPayload,
  ): Promise<Claims> {
    if (typeof payload.sub !== "string" || payload.sub.trim().length === 0) {
      throw new Error(
        "le jeton ne fournit pas de sub de référence pour userinfo",
      );
    }
    const endpoint = await this.resolveEndpoint();
    const response = await this.fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json, application/jwt",
      },
      signal: AbortSignal.timeout(this.options.timeoutMs),
    });
    if (!response.ok) {
      throw new Error(`userinfo a répondu HTTP ${response.status}`);
    }
    const contentType = response.headers.get("content-type") ?? "";
    const signed = contentType.includes("application/jwt");
    if (this.options.requireSignedResponse && !signed) {
      throw new Error(
        "une réponse userinfo signée est requise par la configuration",
      );
    }
    const body: unknown = signed
      ? await this.options.verifyJwt((await response.text()).trim())
      : await response.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new Error("réponse userinfo illisible");
    }
    const record = body as Claims;
    // Le jeton déjà vérifié est notre référence d'identité pour ce repli serveur.
    if (record.sub !== payload.sub) {
      throw new Error(
        "le sub de userinfo est absent ou ne correspond pas à celui du jeton",
      );
    }
    if (signed) this.assertSignedResponseBinding(record, payload);
    return Object.fromEntries(
      this.options.claimNames
        .filter((name) => name in record)
        .map((name) => [name, record[name]]),
    );
  }

  /** OIDC Core §5.3.2 : une réponse signée doit porter `iss` et `aud`. */
  private assertSignedResponseBinding(record: Claims, payload: JWTPayload) {
    if (
      typeof payload.iss !== "string" ||
      payload.iss.trim().length === 0 ||
      record.iss !== payload.iss
    ) {
      throw new Error(
        "l'émetteur de la réponse userinfo signée est absent ou diffère du jeton",
      );
    }
    const clientId = this.options.clientId;
    const audiences = Array.isArray(record.aud) ? record.aud : [record.aud];
    if (
      !clientId ||
      !audiences.every((value) => typeof value === "string") ||
      !audiences.includes(clientId)
    ) {
      throw new Error("la réponse userinfo signée ne vise pas ce client");
    }
  }

  private async resolveEndpoint(): Promise<string> {
    if (this.endpoint) return this.endpoint;
    if (
      this.discoveryFailedAt !== undefined &&
      this.now() - this.discoveryFailedAt < DISCOVERY_RETRY_MS
    ) {
      throw new Error("découverte de l'endpoint userinfo en échec récent");
    }
    try {
      const response = await this.fetch(this.options.discoveryUrl, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(this.options.timeoutMs),
      });
      if (!response.ok) {
        throw new Error(`document de découverte : HTTP ${response.status}`);
      }
      const document: unknown = await response.json();
      const endpoint =
        typeof document === "object" && document !== null
          ? (document as { userinfo_endpoint?: unknown }).userinfo_endpoint
          : undefined;
      if (typeof endpoint !== "string" || endpoint.length === 0) {
        throw new Error("userinfo_endpoint absent du document de découverte");
      }
      // Le jeton porteur y sera envoyé : seul un endpoint http(s) est accepté.
      const protocol = new URL(endpoint).protocol;
      if (protocol !== "https:" && protocol !== "http:") {
        throw new Error("userinfo_endpoint n'est pas une URL http(s)");
      }
      this.endpoint = endpoint;
      this.discoveryFailedAt = undefined;
      return endpoint;
    } catch (error) {
      this.discoveryFailedAt = this.now();
      throw error;
    }
  }

  private store(key: string, entry: CacheEntry): void {
    const maxEntries = this.options.maxEntries ?? DEFAULT_MAX_ENTRIES;
    if (this.cache.size >= maxEntries) {
      const now = this.now();
      for (const [cachedKey, cached] of this.cache) {
        if (cached.expiresAt <= now) this.cache.delete(cachedKey);
      }
      // Map conserve l'ordre d'insertion : on évince les plus anciennes entrées.
      for (const cachedKey of this.cache.keys()) {
        if (this.cache.size < maxEntries) break;
        this.cache.delete(cachedKey);
      }
    }
    this.cache.set(key, entry);
  }

  private reportError(error: unknown): void {
    const now = this.now();
    if (
      this.lastErrorLogAt !== undefined &&
      now - this.lastErrorLogAt < ERROR_LOG_INTERVAL_MS
    ) {
      return;
    }
    this.lastErrorLogAt = now;
    const reason = error instanceof Error ? error.message : String(error);
    this.options.onError?.(
      `[AuthLevel] Repli userinfo en échec (le claim est traité comme absent) : ${reason}`,
    );
  }

  private fetch(input: string, init: RequestInit): Promise<Response> {
    return (this.options.fetchFn ?? globalThis.fetch)(input, init);
  }

  private now(): number {
    return this.options.now?.() ?? Date.now();
  }
}
