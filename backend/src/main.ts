import type { AppConfig } from "./config/configs/app.config";
import type { OidcConfig } from "./config/configs/oidc.config";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { Logger as PinoLogger } from "nestjs-pino";
import { AppModule } from "./app.module";
import { setupGlobalValidation } from "./config/app-config";
import { setupSwagger } from "./swagger-config";

async function bootstrap() {
  const globalPrefix = "/api/v2";
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const configService = app.get(ConfigService);
  const appConfig = configService.get<AppConfig>("app");
  const oidcConfig = configService.get<OidcConfig>("oidc");

  app.useLogger(app.get(PinoLogger));
  app.setGlobalPrefix(globalPrefix);

  const globalLogger = new Logger("Bootstrap");

  globalLogger.log("RequestLoggingInterceptor registered");
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Configuration de Swagger
  setupSwagger(app, appConfig, oidcConfig);

  // Setup global validation
  setupGlobalValidation(app);

  await app.listen(appConfig.port, appConfig.host);
  globalLogger.log(
    `Application is running on: http://${appConfig.host}:${appConfig.port}`,
  );
}
bootstrap();
