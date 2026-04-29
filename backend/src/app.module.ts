import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule as NestConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
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
import { ReportModule } from "./report/report.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ApplicationModule } from "./applications/application.module";
import { RelationModule } from "./relationship/relation.module";
import { LoggingService } from "./services/logging.service";
import { StatsModule } from "./stats/stats.module";
import { StatusesModule } from "./statuses/statuses.module";
import { TagsModule } from "./tag/tags.module";
import { TechnicalDebtInfoModule } from "./technical-debt-info/technical-debt-info.module";
import { TokenModule } from "./token/token.module";
import { UserModule } from "./user/user.module";
import { LabelSourceModule } from "./label-source/label-source.module";
import { DataSourceModule } from "./data-source/data-source.module";
import { RgaaModule } from "./rgaa/rgaa.module";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    NestConfigModule.forRoot({
      isGlobal: true,
      load: configs,
      envFilePath: [".env"],
      cache: true,
    }),
    ConfigModule,
    PrismaModule,
    LoggerModule,
    TokenModule,
    MetadatasModule,
    ApplicationModule,
    DataSourceModule,
    RelationModule,
    OrganizationsModule,
    UserModule,
    ActorModule,
    ActorTypeModule,
    CompliancesModule,
    HostingsModule,
    HostingOptionModule,
    LabelsModule,
    LabelSourceModule,
    LinksModule,
    TagsModule,
    TechnicalDebtInfoModule,
    RgaaModule,
    PrismaModule,
    ConfigModule,
    StatusesModule,
    StatsModule,
    ReportModule,
    HealthCheckModule,
  ],
  controllers: [AppController],
  providers: [AppService, LoggingService, AuthMiddleware],
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
