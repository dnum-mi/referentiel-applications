import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class ApplicationViewService {
  constructor(private readonly prisma: PrismaService) {}

  async createView(applicationId: string, userId: string) {
    const since = new Date();
    since.setMinutes(since.getMinutes() - 15);

    return this.prisma.$transaction(async (_tx) => {
      const existingView = await this.prisma.applicationView.findFirst({
        where: {
          applicationId,
          userId,
          createdAt: {
            gte: since,
          },
        },
      });

      if (existingView) return;

      return this.prisma.applicationView.create({
        data: {
          userId,
          applicationId,
        },
      });
    });
  }

  async getView(applicationId: string, nbMonths: number = 12) {
    const since = new Date();
    since.setMonth(since.getMonth() - nbMonths);

    return this.prisma.applicationView.count({
      where: {
        applicationId,
        createdAt: {
          gte: since,
        },
      },
    });
  }
}
