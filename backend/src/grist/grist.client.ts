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

export type GristRequest = { method?: "GET" | "POST" | "PUT"; body?: unknown };

/// Client HTTP du document Grist configuré (GRIST_DOC_ID). Grist est hors SI : les appels
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
    path: string,
    { method = "GET", body }: GristRequest = {},
  ): Promise<T> {
    const { url, apiKey, docId, timeoutMs } = this.config;
    if (!apiKey || !docId) {
      throw new ServiceUnavailableException(
        "Grist n'est pas configuré (GRIST_API_KEY, GRIST_DOC_ID).",
      );
    }

    const startedAt = Date.now();
    let response: Awaited<ReturnType<typeof fetch>>;
    try {
      response = await fetch(`${url}/api/docs/${docId}${path}`, {
        method,
        dispatcher: getOutboundDispatcher(),
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (error) {
      logger.warn(
        `${method} ${path} : Grist injoignable après ${Date.now() - startedAt} ms (${(error as Error).name})`,
      );
      throw new ServiceUnavailableException("Grist est injoignable.");
    }

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      logger.warn(
        `${method} ${path} → ${response.status} ${JSON.stringify(payload)}`,
      );
      throw new BadGatewayException(
        `Grist a refusé la requête (${response.status}).`,
      );
    }
    return payload as T;
  }
}
