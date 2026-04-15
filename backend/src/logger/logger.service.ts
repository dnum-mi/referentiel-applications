import { Injectable } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";

@Injectable()
export class LoggerService {
  constructor(private readonly logger: PinoLogger) {}

  log(message: string) {
    this.logger.info(message);
  }

  error(message: unknown, error?: unknown) {
    this.logger.error(
      { trace: this.formatTrace(error) },
      this.formatError(message),
    );
  }

  warn(message: string) {
    this.logger.warn(message);
  }

  debug(message: string) {
    this.logger.debug(message);
  }

  verbose(message: string) {
    this.logger.trace(message);
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    return "Unknown error";
  }
  private formatTrace(error: unknown): string {
    if (error instanceof Error) return error.stack;
    return "";
  }
}
