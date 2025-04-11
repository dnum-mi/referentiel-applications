import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from './logger/logger.module';
import { CombinedInterceptor } from './logger/combined.interceptor';
import { AuthMiddleware } from './middlewares/auth.middleware';
import { HealthCheckModule } from './health/health-check.module';
import { EventsModule } from './events/events.module';
import { OrganizationModule } from './organization/organization.module';
import { ActorTypeModule } from './actorType/actorType.module';
import { MetadatasModule } from './metadatas/metadatas.module';
import { RelationModule } from './relationship/relation.module';
import { UserModule } from './user/user.module';
import { ApplicationModule } from './product/application.module';
import { HostingModule } from './hosting/hosting.module';
import { ApplicationService } from './product/application.service';
import { AnomalyNotificationModule } from './notification/anomaly-notification.module';
import { ActorModule } from './actor/actor.module';
import { LinksModule } from './links/links.module';
import { LabelsModule } from './labels/labels.module';
import { ApplicationSearchModule } from './search/search.module';

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
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EventsModule,
    MetadatasModule,
    LinksModule,
    LabelsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ApplicationService,
    CombinedInterceptor,
    AuthMiddleware,
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
