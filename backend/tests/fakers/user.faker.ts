import type { Permission, Prisma, Roles as RolesType } from "@prisma/client";
import { Roles } from "@prisma/client";
import type { AsyncReturnType } from "src/utils/types.util";
import { faker } from "@faker-js/faker";
import { getPrismaClient } from "./prisma";

export type UserFakerReturnType = AsyncReturnType<typeof UserFaker.create>;
interface UserFakerParams {
  email?: string;
  role?: RolesType;
  additionalPermissions?: Permission[];
}
export class UserFaker {
  static async create({
    email = faker.internet.email(),
    role = Roles.VISITOR,
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
          role,
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
