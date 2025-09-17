import {
  Module,
  NestModule,
  MiddlewareConsumer,
} from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ApplicationModule } from "./product/application.module";
import { PrismaModule } from "./prisma/prisma.module";
import { HostingModule } from "./hosting/hosting.module";
import { LoggerModule } from "./logger/logger.module";
import { HealthCheckModule } from "./health/health-check.module";
import { UserModule } from "./user/user.module";
import { OrganizationModule } from "./organization/organization.module";
import { ActorTypeModule } from "./actorType/actorType.module";
import { AuthMiddleware } from "./middlewares/auth.middleware";
import { ApplicationService } from "./product/application.service";
import { ConfigModule as NestConfigModule } from "@nestjs/config";
import { RelationModule } from "./relationship/relation.module";
import { MetadataModule } from "./metadata/metadata.module";
import { AnomalyNotificationModule } from "./notification/anomaly-notification.module";
import { ActorModule } from "./actor/actor.module";
import { LinksModule } from "./links/links.module";
import { LabelsModule } from "./labels/labels.module";
import { CompliancesModule } from "./compliances/compliances.module";
import { HostingOptionModule } from "./hosting-option/hosting-option.module";
import { StatsModule } from "./stats/stats.module";
import { ScheduleModule } from "@nestjs/schedule";
import { LoggingService } from "./services/logging.service";
import { ActionLogService } from "./action-log/action-log.service";
import { configs } from "./config/configs/index";
import { ConfigModule } from "./config/config.module";
import { TokenModule } from "./token/token.module";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    NestConfigModule.forRoot({
      isGlobal: true,
      load: configs,
      envFilePath: [".env"],
      cache: true,
    }),
    PrismaModule,
    RelationModule,
    UserModule,
    ApplicationModule,
    HostingModule,
    TokenModule,
    AnomalyNotificationModule,
    LoggerModule,
    HealthCheckModule,
    StatsModule,
    OrganizationModule,
    ActorTypeModule,
    ActorModule,
    HostingOptionModule,
    MetadataModule,
    LinksModule,
    LabelsModule,
    CompliancesModule,
    PrismaModule,
    ConfigModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ApplicationService,
    ActionLogService,
    LoggingService,
    AuthMiddleware,
  ],
  exports: [LoggingService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .exclude(
        "/health-check",
        "/swagger/**",
        "",
        "/config",
      )
      .forRoutes("*");
  }
}
