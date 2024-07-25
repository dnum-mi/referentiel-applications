import { Module } from '@nestjs/common';
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
import { JwtAuthGuard } from './auth/jwt-auth-guard.guard';
import { APP_GUARD } from '@nestjs/core';
import { CompliancesModule } from './compliances/compliances.module';
import { PoliciesGuard } from './auth/policies-guard.guard';

@Module({
  imports: [
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
  controllers: [GlobalSearchController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PoliciesGuard,
    },
  ],
})
export class AppModule {}
