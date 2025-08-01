import { faker } from "@faker-js/faker";
import { getPrismaClient } from "./prisma";

export class HostingOptionFaker {
  static async create(override = {}) {
    const prisma = getPrismaClient();

    const platform = faker.helpers.arrayElement([
      "PHYSIQUE",
      "VIRTUALISATION",
      "CLOUD PI NATIVE",
      "CLOUD PI GEN2",
      "ISOCELE",
    ]);
    const provider = faker.helpers.arrayElement([
      "DTNUM",
      "STIG",
      "OUTSCALE",
      "OVH",
      "SCALEWAY",
      "SGAMI",
      "ATE",
      "PP",
    ]);

    return await prisma.hostingOption.create({
      data: {
        site: faker.location.city(),
        platform,
        provider,
        building: faker.helpers.maybe(
          () => `B${faker.number.int({ min: 1, max: 30 })}`,
        ),
        room: faker.helpers.maybe(
          () => `IT${faker.number.int({ min: 1, max: 5 })}`,
        ),
        ...override,
      },
    });
  }
}
