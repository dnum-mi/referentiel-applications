import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppType } from '@prisma/client';

@Injectable()
export class AppTypeService {
  constructor(private prisma: PrismaService) {}

  async getAllTypes(): Promise<AppType[]> {
    return this.prisma.appType.findMany();
  }

  async getTypeById(id: string): Promise<AppType> {
    const type = await this.prisma.appType.findUnique({
      where: { applicationtypecode: id },
    });
    if (!type) {
      throw new NotFoundException(`Type with code ${id} not found`);
    }
    return type;
  }

  async createType(data: {
    applicationtypecode: string;
    label: string;
  }): Promise<AppType> {
    return this.prisma.appType.create({
      data,
    });
  }

  async updateType(id: string, data: { label: string }): Promise<AppType> {
    const type = await this.prisma.appType.update({
      where: { applicationtypecode: id },
      data,
    });
    if (!type) {
      throw new NotFoundException(`Type with code ${id} not found`);
    }
    return type;
  }

  async deleteType(id: string): Promise<AppType> {
    const type = await this.prisma.appType.delete({
      where: { applicationtypecode: id },
    });
    if (!type) {
      throw new NotFoundException(`Type with code ${id} not found`);
    }
    return type;
  }
}
