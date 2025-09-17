import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { Requestor } from "src/user/entities/user.entity";

@Injectable()
export class ActionLogService {
  constructor(private readonly prisma: PrismaService) {}

  async updateUserLastLogin(user: Pick<Requestor, "id">) {
    return this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });
  }
}
