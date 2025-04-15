// src/main.ts
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { CombinedInterceptor } from './logger/combined.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  if (!process.env.DISABLE_PINO_LOGGER) {
    app.useLogger(app.get(PinoLogger));
  }
  app.setGlobalPrefix('api/v2');

  const combinedInterceptor = app.get(CombinedInterceptor);
  app.useGlobalInterceptors(combinedInterceptor);
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Configuration de Swagger
  const config = new DocumentBuilder()
    .setTitle('API Référentiel Applications')
    .setDescription('API pour la gestion des applications')
    .setVersion('2.0')
    .addOAuth2(
      {
        type: 'oauth2',
        description: 'OAuth2 authentication using Keycloak',
        flows: {
          authorizationCode: {
            authorizationUrl: `${process.env.KEYCLOAK_BASE_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/auth`,
            tokenUrl: `${process.env.KEYCLOAK_BASE_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
            scopes: {
              openid: 'OpenID scope',
              profile: 'Profile scope',
            },
          },
        },
      },
      'oauth2',
    )
    .addSecurityRequirements('oauth2')
    .build();
  const document = SwaggerModule.createDocument(app, config);

  app.use('/api/v2/swagger/json', (_, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(document);
  });

  SwaggerModule.setup('api/v2/', app, document, {
    explorer: true,
    jsonDocumentUrl: 'swagger/json',
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(3500);
}
bootstrap();
