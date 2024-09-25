import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RefSensitivity } from '@prisma/client';

@Injectable()
export class RefSensitivityService {
  constructor(private prisma: PrismaService) {}

  async getAllSensitivities(): Promise<RefSensitivity[]> {
    return this.prisma.refSensitivity.findMany();
  }

  async getSensitivityById(id: string): Promise<RefSensitivity> {
    const sensitivity = await this.prisma.refSensitivity.findUnique({
      where: { sensitivitycode: id },
    });
    if (!sensitivity) {
      throw new NotFoundException(`Sensitivity with code ${id} not found`);
    }
    return sensitivity;
  }

  async createSensitivity(data: {
    sensitivitycode: string;
    label: string;
  }): Promise<RefSensitivity> {
    return this.prisma.refSensitivity.create({
      data,
    });
  }

  async updateSensitivity(
    id: string,
    data: { label: string },
  ): Promise<RefSensitivity> {
    const sensitivity = await this.prisma.refSensitivity.update({
      where: { sensitivitycode: id },
      data,
    });
    if (!sensitivity) {
      throw new NotFoundException(`Sensitivity with code ${id} not found`);
    }
    return sensitivity;
  }

  async deleteSensitivity(id: string): Promise<RefSensitivity> {
    const sensitivity = await this.prisma.refSensitivity.delete({
      where: { sensitivitycode: id },
    });
    if (!sensitivity) {
      throw new NotFoundException(`Sensitivity with code ${id} not found`);
    }
    return sensitivity;
  }
}
