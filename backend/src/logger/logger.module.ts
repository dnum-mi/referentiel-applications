import { Module } from "@nestjs/common";
import { LoggerModule as PinoLoggerModule } from "nestjs-pino";
import type { Options } from "pino-http";
import { API_KEY_HEADER } from "../utils/constants.util";
import { LoggerService } from "./logger.service";

const isProduction = process.env.NODE_ENV === "production";
const logLevel = process.env.LOG_LEVEL || "info";

export const httpLoggerOptions: Options = {
  redact: {
    paths: ["req.headers.authorization", `req.headers["${API_KEY_HEADER}"]`],
    remove: true,
  },
  transport: isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          singleLine: true,
        },
      },
  level: logLevel,
  // Silence HTTP logs during tests
  enabled: process.env.NODE_ENV !== "test",
};

@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: httpLoggerOptions,
    }),
  ],
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
