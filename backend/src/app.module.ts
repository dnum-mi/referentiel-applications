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
import { ActionLogMiddleware } from "./middlewares/action-log.middleware";
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
import { MditCampaignModule } from "./mdit-campaign/mdit-campaign.module";
import { RgaaModule } from "./rgaa/rgaa.module";
import { TechnologyModule } from "./technology/technology.module";
import { DataCatalogModule } from "./data-catalog/data-catalogue.module";
import { DataFamilyModule } from "./data-catalog/data-family/data-family.module";
import { DataSensibilityModule } from "./data-catalog/data-sensibility/data-sensibility.module";
import { OrganizationMaiaReferencesModule } from "./organization-maia-references/organization-maia-references.module";
import { ImportModule } from "./import/import.module";
import { MaintenanceModule } from "./maintenance/maintenance.module";
import { MaintenanceMiddleware } from "./maintenance/maintenance.middleware";

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
    MaintenanceModule,
    LoggerModule,
    TokenModule,
    MetadatasModule,
    ApplicationModule,
    DataCatalogModule,
    DataFamilyModule,
    DataSensibilityModule,
    RelationModule,
    OrganizationsModule,
    OrganizationMaiaReferencesModule,
    UserModule,
    ActorModule,
    ActorTypeModule,
    CompliancesModule,
    ImportModule,
    HostingsModule,
    HostingOptionModule,
    LabelsModule,
    LabelSourceModule,
    MditCampaignModule,
    LinksModule,
    TagsModule,
    TechnicalDebtInfoModule,
    RgaaModule,
    TechnologyModule,
    PrismaModule,
    ConfigModule,
    StatusesModule,
    StatsModule,
    ReportModule,
    HealthCheckModule,
  ],
  controllers: [AppController],
  providers: [AppService, LoggingService, AuthMiddleware, ActionLogMiddleware],
  exports: [LoggingService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Syntaxe path-to-regexp v8 (Express 5 / Nest 11) : le wildcard doit être NOMMÉ —
    // `{*splat}` matche tout y compris la racine ; l'ancien `*` nu et le glob `**`
    // ne sont plus des motifs valides.
    const unauthenticatedRoutes = [
      "/health-check",
      "/swagger/{*splat}",
      "",
      "/config",
    ];

    consumer
      .apply(MaintenanceMiddleware)
      .exclude(...unauthenticatedRoutes)
      .forRoutes("{*splat}");

    consumer
      .apply(AuthMiddleware)
      .exclude(...unauthenticatedRoutes)
      .forRoutes("{*splat}");

    // Après AuthMiddleware : journalise les requêtes mutantes avec l'identité
    // effective et l'éventuel impersonator posés par celui-ci (#2224).
    consumer
      .apply(ActionLogMiddleware)
      .exclude(...unauthenticatedRoutes)
      .forRoutes("{*splat}");
  }
}
