// src/main.ts
import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Logger as PinoLogger } from "nestjs-pino";
import { AppModule } from "./app.module";
import { setupSwagger } from "./swagger-config.js";
import { ConfigService } from "@nestjs/config";

async function bootstrap() {
  const globalPrefix = "/api/v2";
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const configService = app.get(ConfigService);
  const port = configService.get<number>("app.port");
  const host = configService.get<string>("app.host");

  if (!process.env.DISABLE_PINO_LOGGER) {
    app.useLogger(app.get(PinoLogger));
  }
  app.setGlobalPrefix(globalPrefix);

  const globalLogger = new Logger("Bootstrap");

  globalLogger.log("RequestLoggingInterceptor registered");
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Configuration de Swagger
  setupSwagger(app, true);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(port, host);
  globalLogger.log(`Application is running on: http://${host}:${port}`);
}
bootstrap();
