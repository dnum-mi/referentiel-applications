import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UserController } from './user/user.controller';
import { ConfigModule } from '@nestjs/config';
import { ExportService } from './product/export.service';
import { AnomalyNotificationModule } from './notification/anomaly-notification.module';
import { AnomalyNotificationController } from './notification/anomaly-notification.controller';
import { AnomalyNotificationService } from './notification/anomaly-notification.service';
import { LoggerModule } from './logger/logger.module';
import { CombinedInterceptor } from './logger/combined.interceptor';
import { AuthMiddleware } from './middlewares/auth.middleware';
import { ApplicationModule } from './product/application.module';
import { ApplicationController } from './product/application.controller';
import { ApplicationService } from './product/application.service';
import { UserModule } from './user/user.module';
import { UserService } from './user/user.service';
import { HealthCheckModule } from './health/health-check.module';
import { EventsModule } from './events/events.module';
import { OrganizationModule } from './organization/organization.module';
import { OrganizationController } from './organization/organization.controller';
import { OrganizationService } from './organization/organization.service';
import { MetadatasService } from './metadatas/metadatas.service';
import { MetadatasModule } from './metadatas/metadatas.module';
import { RelationModule } from './relationship/relation.module';

@Module({
  imports: [
    PrismaModule,
    RelationModule,
    UserModule,
    ApplicationModule,
    AnomalyNotificationModule,
    LoggerModule,
    HealthCheckModule,
    OrganizationModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EventsModule,
    MetadatasModule,
  ],
  controllers: [
    AppController,
    ApplicationController,
    AnomalyNotificationController,
    UserController,
    OrganizationController,
  ],
  providers: [
    AppService,
    ApplicationService,
    AnomalyNotificationService,
    ExportService,
    UserService,
    OrganizationService,
    CombinedInterceptor,
    AuthMiddleware,
    MetadatasService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .exclude({ path: '/health-check', method: RequestMethod.GET })
      .forRoutes('*');
  }
}
