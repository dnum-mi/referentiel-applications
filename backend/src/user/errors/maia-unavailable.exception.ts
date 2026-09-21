import { ServiceUnavailableException } from "@nestjs/common";

const messages = {
  configuration: "Le service MAIA n'est pas configuré.",
  timeout: "Le service MAIA n'a pas répondu dans le délai imparti.",
  network: "Le service MAIA est injoignable.",
  http: "Le service MAIA a renvoyé une erreur HTTP.",
  response: "Le service MAIA a renvoyé une réponse illisible ou invalide.",
};

export class MaiaUnavailableException extends ServiceUnavailableException {
  constructor(
    readonly reason: keyof typeof messages,
    cause?: unknown,
    readonly upstreamStatus?: number,
  ) {
    super(messages[reason], { cause });
  }
}
