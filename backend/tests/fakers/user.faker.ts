import { KeycloakService } from "../../src/services/keycloak.service";
import { faker } from "@faker-js/faker";
import { getPrismaClient } from "./prisma";
import type { UserCapabilities } from "src/user/entities/user.entity";
import { AdminLevel } from "src/user/entities/user.entity";
import type { AsyncReturnType } from "src/utils/types.util";
import type { Prisma } from "@prisma/client";

const keycloakService = new KeycloakService();
export type UserFakerReturnType = AsyncReturnType<typeof UserFaker.create>;
interface UserFakerParams {
  adminLevel?: AdminLevel
  capabilities?: (keyof typeof UserCapabilities)[]
}
export class UserFaker {
  static async create({ adminLevel = AdminLevel.NONE, capabilities = [] }: UserFakerParams = {}) {
    const prisma = getPrismaClient();
    const email = faker.internet.email();
    const username = email;

    const adminToken = await keycloakService.getAdminToken();
    const keycloakUserID = await keycloakService.createUser(adminToken, {
      email,
      username,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    });
    let user = await prisma.user.findUnique({
      where: { keycloakId: keycloakUserID },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          keycloakId: keycloakUserID,
          adminLevel,
          capabilities: [...capabilities],
        },
      });
    }

    function updateUserInDB(data: Prisma.UserUpdateInput) {
      return prisma.user.update({
        where: { id: user!.id },
        data,
      });
    }
    return {
      ...user,
      update: updateUserInDB,
    };
  }
}
