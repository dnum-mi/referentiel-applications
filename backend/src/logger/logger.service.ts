import { Injectable } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";

@Injectable()
export class LoggerService {
  constructor(private readonly logger: PinoLogger) {}

  log(message: string) {
    this.logger.info(message);
  }

  error(message: string, trace?: string) {
    this.logger.error({ trace }, message);
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
}
