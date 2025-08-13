import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { User } from "@prisma/client";

@Injectable()
export class ActionLogService {
  constructor(private readonly prisma: PrismaService) {}

  async updateUserLastLogin(user: Pick<User, "keycloakId">) {
    return this.prisma.user.update({
      where: { keycloakId: user.keycloakId },
      data: { lastLogin: new Date() },
    });
  }
}
