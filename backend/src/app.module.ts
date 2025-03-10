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
import { MetadatasModule } from './metadatas/metadatas.module';
import { RelationModule } from './relationship/relation.module';
import { UserModule } from './user/user.module';
import { ApplicationModule } from './product/application.module';
import { ApplicationService } from './product/application.service';
import { AnomalyNotificationModule } from './notification/anomaly-notification.module';

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
