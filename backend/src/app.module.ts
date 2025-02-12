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

@Module({
  imports: [
    PrismaModule,
    UserModule,
    ApplicationModule,
    AnomalyNotificationModule,
    LoggerModule,
    HealthCheckModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [
    AppController,
    ApplicationController,
    AnomalyNotificationController,
    UserController,
  ],
  providers: [
    AppService,
    ApplicationService,
    AnomalyNotificationService,
    ExportService,
    UserService,
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
