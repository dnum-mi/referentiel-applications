import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { ActeursModule } from './acteurs/acteurs.module';
import { OrganisationsModule } from './organisations/organisations.module';
import { PrismaModule } from './prisma/prisma.module';
import { ApplicationsModule } from './applications/applications.module';
import { CapabilitiesModule } from './capabilities/capabilities.module';
import { InstancesModule } from './instances/instances.module';
import { ApplicationsFlowModule } from './applications-flow/applications-flow.module';
import { ApplicationsFlowDataModule } from './applications-flow-data/applications-flow-data.module';
import { GlobalSearchController } from './global-search/global-search.controller';
import { UrbanzonesModule } from './urbanzones/urbanzones.module';
import { UsersModule } from './users/users.module';
import { ApplicationRolesModule } from './application-roles/application-roles.module';
import { EnvironmentVariablesModule } from './environment-variables/environment-variables.module';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { CompliancesModule } from './compliances/compliances.module';
import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import {
  KeycloakConnectModule,
  ResourceGuard,
  RoleGuard,
  AuthGuard,
} from 'nest-keycloak-connect';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { memoryStore } from './keycloak-config';
import { KeycloakMiddleware } from './keycloak.middleware';
import session from 'express-session';

@Module({
  imports: [
    KeycloakConnectModule.register({
      authServerUrl: process.env.KEYCLOAK_SERVER_URL!,
      realm: process.env.KEYCLOAK_REALM!,
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      secret: process.env.KEYCLOAK_CLIENT_SECRET!,
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule.register(),
    PrismaModule,
    ActeursModule,
    OrganisationsModule,
    PrismaModule,
    ApplicationsModule,
    CapabilitiesModule,
    InstancesModule,
    ApplicationsFlowModule,
    ApplicationsFlowDataModule,
    UrbanzonesModule,
    UsersModule,
    ApplicationRolesModule,
    EnvironmentVariablesModule,
    AuthModule,
    CompliancesModule,
  ],
  controllers: [GlobalSearchController, AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ResourceGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RoleGuard,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        session({
          secret: process.env.SESSION_SECRET!,
          resave: false,
          saveUninitialized: true,
          store: memoryStore,
        })
      )
      .forRoutes('*');

    consumer
      .apply(KeycloakMiddleware)
      .forRoutes({ path: '/secure', method: RequestMethod.ALL });
  }
}
