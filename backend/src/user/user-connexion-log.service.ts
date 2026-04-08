import { Injectable } from "@nestjs/common";
import { User, UserConnexionLog } from "@prisma/client";
import { BaseService } from "src/common/base.service";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class UserConnexionLogService extends BaseService<UserConnexionLog> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma.userConnexionLog, prisma);
  }

  public log(userId: User["id"]) {
    return this.create({
      userId,
      createdAt: new Date(),
    });
  }
}
