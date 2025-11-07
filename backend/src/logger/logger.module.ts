import { Module } from "@nestjs/common";
import { LoggerModule as PinoLoggerModule } from "nestjs-pino";
import { LoggerService } from "./logger.service";

const isProduction = process.env.NODE_ENV === "production";
const logLevel = process.env.LOG_LEVEL || "info";

@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        redact: {
          paths: ["req.headers.authorization"],
          remove: true,
        },
        transport:
          !isProduction
            ? {
                target: "pino-pretty",
                options: {
                  colorize: true,
                  translateTime: "SYS:standard",
                  singleLine: true,
                },
              }
            : undefined,
        level: logLevel,
      },
    }),
  ],
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
