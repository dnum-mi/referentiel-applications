import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule as NestConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { ActionLogService } from "./action-log/action-log.service";
import { ActorModule } from "./actor/actor.module";
import { ActorTypeModule } from "./actorType/actorType.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { CompliancesModule } from "./compliances/compliances.module";
import { ConfigModule } from "./config/config.module";
import { configs } from "./config/configs/index";
import { HealthCheckModule } from "./health/health-check.module";
import { HostingOptionModule } from "./hosting-option/hosting-option.module";
import { HostingsModule } from "./hostings/hostings.module";
import { LabelsModule } from "./labels/labels.module";
import { LinksModule } from "./links/links.module";
import { LoggerModule } from "./logger/logger.module";
import { MetadatasModule } from "./metadatas/metadatas.module";
import { AuthMiddleware } from "./middlewares/auth.middleware";
import { AnomalyNotificationModule } from "./notification/anomaly-notification.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ApplicationModule } from "./product/application.module";
import { RelationModule } from "./relationship/relation.module";
import { LoggingService } from "./services/logging.service";
import { StatsModule } from "./stats/stats.module";
import { StatusesModule } from "./statuses/statuses.module";
import { TagsModule } from "./tag/tags.module";
import { TechnicalDebtInfoModule } from "./technical-debt-info/technical-debt-info.module";
import { TokenModule } from "./token/token.module";
import { UserModule } from "./user/user.module";

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
    HostingsModule,
    TokenModule,
    AnomalyNotificationModule,
    LoggerModule,
    HealthCheckModule,
    StatsModule,
    OrganizationsModule,
    ActorTypeModule,
    ActorModule,
    HostingOptionModule,
    MetadatasModule,
    LinksModule,
    LabelsModule,
    CompliancesModule,
    TagsModule,
    TechnicalDebtInfoModule,
    PrismaModule,
    ConfigModule,
    StatusesModule,
  ],
  controllers: [AppController],
  providers: [AppService, ActionLogService, LoggingService, AuthMiddleware],
  exports: [LoggingService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .exclude("/health-check", "/swagger/**", "", "/config")
      .forRoutes("*");
  }
}
