// import { CacheModule } from '@nestjs/cache-manager';
// import {
//   INestApplication,
//   ModuleMetadata,
//   ValidationPipe,
// } from '@nestjs/common';
// import { ConfigModule } from '@nestjs/config';
// import { Test, TestingModule } from '@nestjs/testing';
// import helmet from 'helmet';
// import { ActeursModule } from './acteurs/acteurs.module';
// import { OrganisationsModule } from './organisations/organisations.module';
// import compression from 'compression';
// import { PrismaModule } from './prisma/prisma.module';
// import { ApplicationsModule } from './applications/applications.module';
// import { CapabilitiesModule } from './capabilities/capabilities.module';
// import { InstancesModule } from './instances/instances.module';
// import { ApplicationsFlowModule } from './applications-flow/applications-flow.module';
// import { ApplicationsFlowDataModule } from './applications-flow-data/applications-flow-data.module';
// import { UrbanzonesModule } from './urbanzones/urbanzones.module';
// import { GlobalSearchController } from './global-search/global-search.controller';
// import { UsersModule } from './users/users.module';
// import { ApplicationRolesModule } from './application-roles/application-roles.module';
// import { EnvironmentVariablesModule } from './environment-variables/environment-variables.module';

// export async function setupTestModule({
//   imports,
//   controllers,
//   providers,
// }: ModuleMetadata = {}): Promise<INestApplication> {
//   const module: TestingModule = await Test.createTestingModule({
//     imports: [
//       CacheModule.register(),
//       ConfigModule.forRoot({ isGlobal: true }),
//       PrismaModule,
//       ...(imports ?? [
//         ActeursModule,
//         OrganisationsModule,
//         PrismaModule,
//         ApplicationsModule,
//         CapabilitiesModule,
//         InstancesModule,
//         ApplicationsFlowModule,
//         ApplicationsFlowDataModule,
//         UrbanzonesModule,
//         UsersModule,
//         ApplicationRolesModule,
//         EnvironmentVariablesModule,
//       ]),
//     ],
//     controllers: [GlobalSearchController, ...(controllers ?? [])],
//     providers: [...(providers ?? [])],
//   }).compile();

//   let app = module.createNestApplication();

//   app.use(compression());
//   app.use(helmet());
//   app.useGlobalPipes(new ValidationPipe());
//   app = await app.init();

//   return app;
// }

// export async function teardownTestModule(app: INestApplication) {
//   if (app) {
//     await app.close();
//   }
// }
