import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { Prisma } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

const CORRELATION_HEADER = "X-Correlation-ID";

/** Message rendu au client quand l'erreur n'a pas été prévue : le détail reste dans les logs. */
export const INTERNAL_ERROR_MESSAGE =
  "Une erreur interne est survenue. Contactez le support en précisant l'identifiant de corrélation.";

interface PrismaMapping {
  status: HttpStatus;
  message: string;
}

/**
 * Codes d'erreur Prisma qui traduisent une situation métier, et non un bug. Les autres codes
 * restent des 500 : un `P2021` (table absente) est un schéma désaligné, pas une faute du client.
 * Les messages sont volontairement génériques — un nom de table ou de colonne renseignerait un
 * appelant sur le schéma interne. Le service qui sait nommer la cause lève son exception
 * explicite en amont (cf. la suppression d'application, #2542).
 */
const PRISMA_ERROR_MAPPING: Record<string, PrismaMapping> = {
  P2000: {
    status: HttpStatus.BAD_REQUEST,
    message: "Une valeur fournie dépasse la longueur autorisée.",
  },
  P2001: {
    status: HttpStatus.NOT_FOUND,
    message: "La ressource demandée est introuvable.",
  },
  P2002: {
    status: HttpStatus.CONFLICT,
    message: "Un enregistrement avec les mêmes valeurs existe déjà.",
  },
  P2003: {
    status: HttpStatus.CONFLICT,
    message: "Des données liées empêchent cette opération.",
  },
  P2011: {
    status: HttpStatus.BAD_REQUEST,
    message: "Un champ obligatoire est absent.",
  },
  P2014: {
    status: HttpStatus.CONFLICT,
    message: "Cette opération romprait une relation obligatoire.",
  },
  P2025: {
    status: HttpStatus.NOT_FOUND,
    message: "La ressource demandée est introuvable.",
  },
};

/**
 * Corps produit par le mapping, avant enrichissement. Type distinct de `NormalizedErrorBody` :
 * `Omit` sur un type portant une signature d'index efface les propriétés nommées, et le spread
 * ne prouverait plus la présence de `statusCode` ni de `message`.
 */
export interface ErrorBodyCore {
  statusCode: number;
  message: string | string[];
  error?: string;
  [key: string]: unknown;
}

export interface NormalizedErrorBody extends ErrorBodyCore {
  correlationId: string;
  timestamp: string;
  path: string;
}

/**
 * Filtre global (#2292). Trois raisons d'exister :
 *
 * 1. **Ne jamais renvoyer un détail interne.** Toute erreur non prévue devenait un 500 portant le
 *    message brut (nom de table Prisma, chemin de fichier, message d'un service tiers).
 * 2. **Traduire les erreurs Prisma** qui traduisent une situation métier (unicité, contrainte,
 *    ressource absente) en statuts HTTP corrects plutôt qu'en 500.
 * 3. **Corréler la réponse et les logs** : l'identifiant posé par `RequestLoggingInterceptor` est
 *    repris dans le corps d'erreur, ce qui permet de retrouver la trace complète à partir d'une
 *    capture d'écran.
 *
 * Le filtre n'invente rien pour les `HttpException` déjà levées par le code : leur corps est
 * conservé tel quel et seulement enrichi. C'est ce qui préserve les contrats existants — le
 * tableau `message` de la validation, et les payloads typés lus par le front (`stepDown`,
 * `strongAuthRequired`, `authLevel`).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    const correlationId = this.resolveCorrelationId(request, response);
    const path: string = httpAdapter.getRequestUrl(request) ?? "";

    const { status, body } = this.describe(exception);

    this.trace(exception, status, correlationId, path);

    const payload: NormalizedErrorBody = {
      ...body,
      correlationId,
      timestamp: new Date().toISOString(),
      path,
    };

    httpAdapter.reply(response, payload, status);
  }

  /**
   * L'identifiant vient de l'intercepteur de log, qui l'a posé sur la réponse avant le handler.
   * Une exception levée plus tôt (garde, middleware) n'en a pas : on en crée un, et on le pose
   * pour que le client puisse le citer.
   */
  private resolveCorrelationId(
    request: { headers?: Record<string, unknown> },
    response: {
      getHeader?: (name: string) => unknown;
      setHeader?: (name: string, value: string) => void;
    },
  ): string {
    const fromResponse = response.getHeader?.(CORRELATION_HEADER);
    if (typeof fromResponse === "string" && fromResponse !== "") {
      return fromResponse;
    }
    const fromRequest = request.headers?.["x-correlation-id"];
    const correlationId =
      typeof fromRequest === "string" && fromRequest !== ""
        ? fromRequest
        : uuidv4();
    response.setHeader?.(CORRELATION_HEADER, correlationId);
    return correlationId;
  }

  private describe(exception: unknown): {
    status: number;
    body: ErrorBodyCore;
  } {
    if (exception instanceof HttpException) {
      return {
        status: exception.getStatus(),
        body: this.fromHttpException(exception),
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapping = PRISMA_ERROR_MAPPING[exception.code];
      if (mapping) {
        return {
          status: mapping.status,
          body: {
            statusCode: mapping.status,
            message: mapping.message,
            error: STATUS_LABELS[mapping.status] ?? "Error",
          },
        };
      }
    }

    if (
      exception instanceof Prisma.PrismaClientInitializationError ||
      exception instanceof Prisma.PrismaClientRustPanicError
    ) {
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        body: {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message: "Le service de données est momentanément indisponible.",
          error: "Service Unavailable",
        },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: INTERNAL_ERROR_MESSAGE,
        error: "Internal Server Error",
      },
    };
  }

  /**
   * Le corps d'une `HttpException` est repris intégralement : Nest y place `message` (texte ou
   * tableau de la validation) et `error`, et le code métier y ajoute ses propres champs.
   */
  private fromHttpException(exception: HttpException): ErrorBodyCore {
    const status = exception.getStatus();
    const payload = exception.getResponse();

    if (typeof payload === "string") {
      return {
        statusCode: status,
        message: payload,
        error: STATUS_LABELS[status] ?? exception.name,
      };
    }

    const body = payload as Record<string, unknown>;
    return {
      ...body,
      statusCode:
        typeof body.statusCode === "number" ? body.statusCode : status,
      message: normalizeMessage(body.message, exception.message),
    };
  }

  /**
   * Un 5xx est un incident : message et pile complète. Un 4xx est un refus attendu ; seuls ceux
   * issus d'une erreur brute (donc d'un code qui ne les avait pas prévus) méritent une trace.
   */
  private trace(
    exception: unknown,
    status: number,
    correlationId: string,
    path: string,
  ): void {
    const prefix = `[${correlationId}] ${path} → ${status}`;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(`${prefix} ${describeCause(exception)}`, stack);
      return;
    }

    if (!(exception instanceof HttpException)) {
      this.logger.warn(`${prefix} ${describeCause(exception)}`);
    }
  }
}

const STATUS_LABELS: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: "Bad Request",
  [HttpStatus.UNAUTHORIZED]: "Unauthorized",
  [HttpStatus.FORBIDDEN]: "Forbidden",
  [HttpStatus.NOT_FOUND]: "Not Found",
  [HttpStatus.CONFLICT]: "Conflict",
  [HttpStatus.UNPROCESSABLE_ENTITY]: "Unprocessable Entity",
  [HttpStatus.BAD_GATEWAY]: "Bad Gateway",
  [HttpStatus.SERVICE_UNAVAILABLE]: "Service Unavailable",
  [HttpStatus.INTERNAL_SERVER_ERROR]: "Internal Server Error",
};

function normalizeMessage(
  candidate: unknown,
  fallback: string,
): string | string[] {
  if (typeof candidate === "string" && candidate !== "") return candidate;
  if (Array.isArray(candidate)) {
    const parts = candidate.filter(
      (part): part is string => typeof part === "string",
    );
    if (parts.length > 0) return parts;
  }
  return fallback;
}

/** Décrit la cause pour les logs — jamais pour la réponse. */
function describeCause(exception: unknown): string {
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    return `PrismaClientKnownRequestError ${exception.code}: ${exception.message}`;
  }
  if (exception instanceof Error) {
    return `${exception.name}: ${exception.message}`;
  }
  return String(exception);
}
