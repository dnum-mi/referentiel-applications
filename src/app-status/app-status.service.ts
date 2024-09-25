import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppStatus } from '@prisma/client';

@Injectable()
export class AppStatusService {
  constructor(private prisma: PrismaService) {}

  async getAllStatuses(): Promise<AppStatus[]> {
    return this.prisma.appStatus.findMany();
  }

  async getStatusById(id: string): Promise<AppStatus> {
    const status = await this.prisma.appStatus.findUnique({
      where: { applicationstatuscode: id },
    });
    if (!status) {
      throw new NotFoundException(`Status with code ${id} not found`);
    }
    return status;
  }

  async createStatus(data: {
    applicationstatuscode: string;
    label: string;
  }): Promise<AppStatus> {
    return this.prisma.appStatus.create({
      data,
    });
  }

  async updateStatus(id: string, data: { label: string }): Promise<AppStatus> {
    const status = await this.prisma.appStatus.update({
      where: { applicationstatuscode: id },
      data,
    });
    if (!status) {
      throw new NotFoundException(`Status with code ${id} not found`);
    }
    return status;
  }

  async deleteStatus(id: string): Promise<AppStatus> {
    const status = await this.prisma.appStatus.delete({
      where: { applicationstatuscode: id },
    });
    if (!status) {
      throw new NotFoundException(`Status with code ${id} not found`);
    }
    return status;
  }
}
