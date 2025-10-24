import { Injectable } from "@nestjs/common";
import { BaseService } from "src/common/base.service";
import { PrismaService } from "src/prisma/prisma.service";
import { ApplicationStatus } from "./entities/status.entity";

@Injectable()
export class StatusesService extends BaseService<ApplicationStatus> {
  constructor(prisma: PrismaService) {
    super(prisma.applicationStatus, prisma);
  }

  async find(filters: { applicationId: string }) {
    return this.prisma.applicationStatus.findMany({
      where: { applicationId: filters.applicationId },
      orderBy: [
        { statusDate: "desc" },
        { createdAt: "desc" },
      ],
    });
  }

  async updateCurrentStatus(applicationId: string): Promise<void> {
    const latestStatus = await this.prisma.applicationStatus.findFirst({
      where: { applicationId },
      orderBy: [
        { statusDate: "desc" },
        { createdAt: "desc" },
      ],
    });

    if (latestStatus) {
      await this.prisma.application.update({
        where: { id: applicationId },
        data: { currentStatusId: latestStatus.id },
      });
    }
  }
}
