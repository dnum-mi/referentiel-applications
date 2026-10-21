import { Injectable } from "@nestjs/common";
import { decodeJwt } from "jose";
import { LoggerService } from "./logger.service";
import { sanitizeHeaders } from "../utils/sanitize-headers.util";

export interface RequestLogContext {
  correlationId: string;
  headers: Record<string, string>;
  [key: string]: unknown;
}

@Injectable()
export class LoggingService {
  constructor(private readonly logger: LoggerService) {}

  async logRequest(context: RequestLogContext) {
    const { correlationId, headers } = context;

    const userInfo = this.extractUserFromToken(
      headers.authorization,
      correlationId,
    );
    this.logger.debug(
      `[${correlationId}] Request complete: ${JSON.stringify({
        ...context,
        headers: sanitizeHeaders(headers),
        user: userInfo,
      })}`,
    );
  }

  extractUserFromToken(authorization: string, correlationId: string) {
    if (!authorization?.startsWith("Bearer ")) return {};
    try {
      const token = authorization.split(" ")[1];
      const decoded = decodeJwt(token);
      return {
        user: decoded.sub,
        email: decoded.email,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`[${correlationId}] JWT decode error: ${message}`);
      return {};
    }
  }
}
