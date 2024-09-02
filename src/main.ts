import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger, ValidationPipe } from '@nestjs/common';
import compression from 'compression';
import { ConfigService } from '@nestjs/config';
import { SwaggerTheme } from 'swagger-themes';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // logger: ['log', 'error', 'warn', 'debug', 'verbose'] ,
  });
  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: [
      'http://localhost:8085',
      'http://localhost:3500',
      'https://api-referentiel-applications.dev.numerique-interieur.com',
      'https://referentiel-applications.dev.numerique-interieur.com',
    ],
    credentials: true,
  });
  app.use(compression());
  app.use(helmet());
  app.useGlobalPipes(new ValidationPipe());

  const logger = new Logger('NestApplication');

  const configService = app.get(ConfigService);

  const config = new DocumentBuilder()
    .setTitle('Référentiel des applications')
    .setDescription('Référentiel des applications API description')
    .setVersion('1.0')
    .setBasePath('/api/v1')
    .addTag('Référentiel des applications')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
        name: 'Authorization',
        description: `Renseignez votre API Token pour accéder à l'API`,
      },
      'token',
    )
    .addSecurityRequirements('token')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  const theme = new SwaggerTheme('v3');
  SwaggerModule.setup('api/v1', app, document, {
    explorer: true,
    jsonDocumentUrl: 'swagger/json',
    //customCss: theme.getBuffer(SwaggerThemeNameEnum.DARK),
  });

  const host = configService.get('HOST');
  const port = parseInt(configService.get('PORT', '3500'));
  const database = configService.get('DATABASE_URL');

  if (host) {
    await app.listen(port, host, () => {});
  } else {
    await app.listen(port);
  }
  logger.log(`Application is running on ${host ?? ''}:${port}`);
  logger.log(`Application listening for Database on ${database}`);
}
bootstrap();
