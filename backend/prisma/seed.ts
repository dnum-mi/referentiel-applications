import { faker } from "@faker-js/faker";
import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import { permissionsToObject } from "../tests/fakers/actor-type.faker";

const prisma = new PrismaClient();

type ModelKeys<T> = {
  [K in keyof T]: T[K] extends { create: any } ? K : never;
}[keyof T];

type PrismaModels = Exclude<ModelKeys<PrismaClient>, "applicationsExport">;
type PrismaModelMap = {
  [key in PrismaModels]: Exclude<Parameters<typeof prisma[key]["createMany"]>[0]["data"], undefined | null>;
};

const organization: Prisma.OrganizationCreateManyInput[] = [{
  label: "Organization 1",
  id: faker.string.uuid(),
}, {
  label: "Organization 2",
  id: faker.string.uuid(),
}];

const hostingOption: Prisma.HostingOptionCreateManyInput[] = [{
  platform: "Hosting Option 1",
  provider: "Provider 1",
  site: "Site 1",
  id: faker.string.uuid(),
}, {
  platform: "Hosting Option 2",
  provider: "Provider 2",
  site: "Site 2",
  id: faker.string.uuid(),
}];

const actorType: Prisma.ActorTypeCreateManyInput[] = [{
  label: "Actor Type 1",
  id: faker.string.uuid(),
}, {
  label: "Actor Type 2",
  id: faker.string.uuid(),
}];

const appPermissions: Prisma.AppPermissionsCreateManyInput[] = [{
  ...permissionsToObject(new Set(["readActors", "writeActors"])),
  actorTypeId: actorType[0].id,
}, {
  ...permissionsToObject(new Set(["readCompliances", "writeCompliances"])),
  actorTypeId: actorType[1].id,
}];

const user: Prisma.UserCreateManyInput[] = [{
  email: "admin@example.com",
  keycloakId: faker.string.uuid(),
}, {
  email: "user@example.com",
  keycloakId: faker.string.uuid(),
}];

const application: Prisma.ApplicationCreateManyInput[] = [{
  label: "Application 1",
  id: faker.string.uuid(),
  ownerId: user[0].keycloakId,
  description: faker.lorem.sentence(),
  quality: 3,
}, {
  label: "Application 2",
  id: faker.string.uuid(),
  ownerId: user[0].keycloakId,
  description: faker.lorem.sentence(),
  quality: 3,
}];

const actor: Prisma.ActorCreateManyInput[] = [{
  actorTypeId: actorType[0].id,
  applicationId: application[0].id,
  email: user[0].email,
}, {
  actorTypeId: actorType[1].id,
  applicationId: application[1].id,
  email: user[0].email,
}];

const prismaModels: PrismaModelMap = {
  organization,
  hostingOption,
  actorType,
  appPermissions,
  user,
  application,
  actor,
  anomalyNotification: null,
  anomalyNotificationHistory: null,
  compliance: null,
  externalRessource: null,
  hosting: null,
  label: null,
  metadata: null,
  organizationClosure: null,
  relation: null,
  stats: null,
};

async function main() {
  try {
    await prisma.$connect();
    console.log("Connected to the database");
    // reset database
    for (const model of Object.keys(prismaModels).reverse() as PrismaModels[]) {
      const prismaModel = prisma[model];
      // @ts-ignore
      await prismaModel.deleteMany({});
    }

    for (const entry of Object.entries(prismaModels)) {
      const model = entry[0] as PrismaModels;
      const data = entry[1] as typeof prismaModels[typeof model];
      if (!data) continue;
      // @ts-ignore
      await prisma[model].createMany({
        data,
      });
    }
    // Seed your database here
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
