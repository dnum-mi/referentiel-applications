import { Module } from "@nestjs/common";
import { LoggerModule as PinoLoggerModule } from "nestjs-pino";
import { LoggerService } from "./logger.service";

@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        redact: {
          paths: ["req.headers.authorization"],
          remove: true,
        },
        transport:
          process.env.NODE_ENV !== "production"
            ? {
                target: "pino-pretty",
                options: {
                  colorize: true,
                  translateTime: "SYS:standard",
                  singleLine: true,
                },
              }
            : undefined,
        level: process.env.LOG_LEVEL || "info",
      },
    }),
  ],
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
