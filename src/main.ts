import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger, ValidationPipe } from '@nestjs/common';
import compression from 'compression';
import { ConfigService } from '@nestjs/config';
import { SwaggerTheme } from 'swagger-themes';
import session from 'express-session';
import passport from 'passport';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // logger: ['log', 'error', 'warn', 'debug', 'verbose'] ,
  });
  app.setGlobalPrefix('api');

  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://canel2.apps.c4.numerique-interieur.com',
    ],
    credentials: true,
  });
  app.use(compression());
  app.use(helmet());
  app.useGlobalPipes(new ValidationPipe());
  app.use(
    session({
      secret: 'process.env.SESSION_SECRET',
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 36000000 },
    }),
  );
  app.use(passport.initialize());
  app.use(passport.session());

  const logger = new Logger('NestApplication');

  const configService = app.get(ConfigService);

  const config = new DocumentBuilder()
    .setTitle('Canel2.1')
    .setDescription('The Canel2.1 API description')
    .setVersion('1.0')
    .addTag('Canel2.1')
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
  SwaggerModule.setup('api', app, document, {
    explorer: true,
    //customCss: theme.getBuffer(SwaggerThemeNameEnum.DARK),
  });

  const host = configService.get('HOST');
  const port = parseInt(configService.get('PORT', '3000'));
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
