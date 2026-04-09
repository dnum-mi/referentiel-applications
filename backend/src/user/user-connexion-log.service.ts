import { Injectable } from "@nestjs/common";
import { User, UserConnexionLog } from "@prisma/client";
import { BaseService } from "src/common/base.service";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class UserConnexionLogService extends BaseService<UserConnexionLog> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma.userConnexionLog, prisma);
  }

  public log(userId: User["id"], authTime: number) {
    const authTimeDate = new Date(authTime * 1000);
    return this.prisma.userConnexionLog.upsert({
      where: { userId_authTime: { userId, authTime: authTimeDate } },
      create: { userId, authTime: authTimeDate },
      update: {},
    });
  }
}
