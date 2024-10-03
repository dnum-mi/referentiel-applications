import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config/dist/config.module';
import { UserModule } from './user/user.module';
import { ApplicationModule } from './application/application.module';
import { RolesModule } from './roles/roles.module';
import { ReferenceModule } from './reference/reference.module';
import { ReferenceRepositoryModule } from './reference-repository/reference-repository.module';
import { ComplianceModule } from './compliance/compliance.module';
import { EnvironmentModule } from './environment/environment.module';
import { LifecycleModule } from './lifecycle/lifecycle.module';
import { MetadataModule } from './metadata/metadata.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule.register(),
    PrismaModule,
    PrismaModule,
    UserModule,
    ApplicationModule,
    RolesModule,
    ReferenceModule,
    ReferenceRepositoryModule,
    ComplianceModule,
    EnvironmentModule,
    LifecycleModule,
    MetadataModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
