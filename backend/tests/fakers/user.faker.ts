import type { Permission, Prisma } from "@prisma/client";
import type { AsyncReturnType } from "src/utils/types.util";
import { faker } from "@faker-js/faker";
import { AdminLevel } from "src/user/entities/user.entity";
import { getPrismaClient } from "./prisma";

export type UserFakerReturnType = AsyncReturnType<typeof UserFaker.create>;
interface UserFakerParams {
  email?: string;
  adminLevel?: AdminLevel;
  additionalPermissions?: Permission[];
}
export class UserFaker {
  static async create({
    email = faker.internet.email(),
    adminLevel = AdminLevel.NONE,
    additionalPermissions = [],
  }: UserFakerParams = {}) {
    const prisma = getPrismaClient();

    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          adminLevel,
          additionalPermissions: [...additionalPermissions],
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
