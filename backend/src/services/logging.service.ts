import { Injectable, Logger } from "@nestjs/common";
import { decodeJwt } from "jose";

@Injectable()
export class LoggingService {
  private readonly logger = new Logger(LoggingService.name);

  constructor() {}

  async logRequest(context: any) {
    const { correlationId, headers } = context;

    const userInfo = this.extractUserFromToken(
      headers.authorization,
      correlationId,
    );
    context.user = userInfo;

    this.logger.debug(
      `[${correlationId}] Request complete:`,
      JSON.stringify(context),
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
      this.logger.error(`[${correlationId}] JWT decode error: ${err}`);
      return {};
    }
  }
}
