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
import { CombinedInterceptor } from './logger/combined.interceptor';
import { ApplicationService } from './product/application.service';
import { ConfigModule } from '@nestjs/config';
import { RelationModule } from './relationship/relation.module';
import { EventsModule } from './events/events.module';
import { MetadatasModule } from './metadatas/metadatas.module';
import { ApplicationSearchModule } from './search/search.module';
import { AnomalyNotificationModule } from './notification/anomaly-notification.module';
import { ActorModule } from './actor/actor.module';
import { LinksModule } from './links/links.module';
import { LabelsModule } from './labels/labels.module';
import { APP_GUARD } from '@nestjs/core';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { CompliancesModule } from './compliances/compliances.module';
import { HostingOptionModule } from './hosting-option/hosting-option.module';

@Module({
  imports: [
    PrismaModule,
    RelationModule,
    UserModule,
    ApplicationModule,
    HostingModule,
    AnomalyNotificationModule,
    LoggerModule,
    HealthCheckModule,
    OrganizationModule,
    ActorTypeModule,
    ApplicationSearchModule,
    ActorModule,
    HostingOptionModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EventsModule,
    MetadatasModule,
    LinksModule,
    LabelsModule,
    CompliancesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ApplicationService,
    CombinedInterceptor,
    AuthMiddleware,
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
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
