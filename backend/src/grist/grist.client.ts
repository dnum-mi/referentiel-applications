import {
  BadGatewayException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { fetch } from "undici";
import { gristConfig } from "src/config/configs/grist.config";
import { getOutboundDispatcher } from "src/common/http/outbound-dispatcher";

const logger = new Logger("Grist");

/// Document visé, avec l'instance et la clé d'API de l'utilisateur qui synchronise.
export type GristDocument = { url: string; apiKey: string; docId: string };

export type GristRequest = {
  method?: "GET" | "POST" | "PUT" | "PATCH";
  body?: unknown;
};

/// Client HTTP des documents Grist. Grist est hors SI : les appels
/// passent par le dispatcher sortant commun, qui honore HTTP(S)_PROXY.
/// La clé d'API n'apparaît jamais dans les logs ni dans les erreurs renvoyées.
@Injectable()
export class GristClient {
  constructor(
    @Inject(gristConfig.KEY)
    private readonly config: ConfigType<typeof gristConfig>,
  ) {}

  /// `path` est relatif au document : `/tables`, `/sql`, `/apply`…
  async request<T>(
    { url, apiKey, docId }: GristDocument,
    path: string,
    { method = "GET", body }: GristRequest = {},
  ): Promise<T> {
    const { timeoutMs } = this.config;

    const startedAt = Date.now();
    let response: Awaited<ReturnType<typeof fetch>>;
    try {
      response = await fetch(
        `${url}/api/docs/${encodeURIComponent(docId)}${path}`,
        {
          method,
          dispatcher: getOutboundDispatcher(),
          signal: AbortSignal.timeout(timeoutMs),
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        },
      );
    } catch (error) {
      logger.warn(
        `${method} ${docId}${path} : Grist injoignable après ${Date.now() - startedAt} ms (${(error as Error).name})`,
      );
      throw new ServiceUnavailableException("Grist est injoignable.");
    }

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      logger.warn(
        `${method} ${docId}${path} → ${response.status} ${JSON.stringify(payload)}`,
      );
      throw new BadGatewayException(
        `Grist a refusé la requête (${response.status}).`,
      );
    }
    return payload as T;
  }
}
