import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApplicationModule } from './product/application.module';
import { PrismaModule } from './prisma/prisma.module';
import { HostingModule } from './hosting/hosting.module';
import { LoggerModule } from './logger/logger.module';
import { HealthCheckModule } from './health/health-check.module';
import { UserModule } from './user/user.module';
import { OrganizationModule } from './organization/organization.module';
import { ActorTypeModule } from './actorType/actorType.module';
import { AuthMiddleware } from './middlewares/auth.middleware';
import { ApplicationService } from './product/application.service';
import { ConfigModule } from '@nestjs/config';
import { RelationModule } from './relationship/relation.module';
import { MetadatasModule } from './metadatas/metadatas.module';
import { AnomalyNotificationModule } from './notification/anomaly-notification.module';
import { ActorModule } from './actor/actor.module';
import { LinksModule } from './links/links.module';
import { LabelsModule } from './labels/labels.module';
import { APP_GUARD } from '@nestjs/core';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { CompliancesModule } from './compliances/compliances.module';
import { HostingOptionModule } from './hosting-option/hosting-option.module';
import { StatsModule } from './stats/stats.module';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggingService } from './services/logging.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    RelationModule,
    UserModule,
    ApplicationModule,
    HostingModule,
    AnomalyNotificationModule,
    LoggerModule,
    HealthCheckModule,
    StatsModule,
    OrganizationModule,
    ActorTypeModule,
    ActorModule,
    HostingOptionModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MetadatasModule,
    LinksModule,
    LabelsModule,
    CompliancesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ApplicationService,
    LoggingService,
    AuthMiddleware,
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
  exports: [LoggingService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .exclude({ path: '/health-check', method: RequestMethod.GET })
      .forRoutes('*');
  }
}
